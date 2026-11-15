import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { scrimUploadsEnabled } from "@/lib/dashboard";
import { EPIC_COOKIE_PATH, EPIC_STATE_COOKIE, epicServerConfig, saveVerifiedEpic, verifyEpicCallback } from "@/lib/epic";
import { recordEvent } from "@/lib/events";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const maxDuration = 30;
const PAGE = "/dashboard/scrims/rocket-league";

/**
 * Epic redirects here with ?code&state. The state cookie must match this signed in player. The Epic Account ID comes from Epic's token
 * endpoint (server to server) and is confirmed by token info; tokens are then dropped. The page shows a fixed message only.
 * The player is sent back to the origin of the configured redirect URI: the exact host Epic returned them to.
 */
export async function GET(req: NextRequest) {
  const cfg = epicServerConfig();
  if (!cfg || !scrimUploadsEnabled()) return new NextResponse(null, { status: 404 });
  const { sb, user } = await requireUser();
  const { data: approved } = await sb.rpc("upload_allowed");
  if (approved !== true) return new NextResponse(null, { status: 404 });

  const q = req.nextUrl.searchParams;
  const done = (params: Record<string, string>) => {
    const res = NextResponse.redirect(new URL(`${PAGE}?${new URLSearchParams(params)}`, new URL(cfg.redirectUri).origin));
    res.cookies.set(EPIC_STATE_COOKIE, "", { httpOnly: true, secure: true, sameSite: "lax", path: EPIC_COOKIE_PATH, maxAge: 0 });
    res.headers.set("Cache-Control", "no-store");
    return res;
  };

  const r = await verifyEpicCallback({ cfg, profileId: user.id, query: { code: q.get("code"), state: q.get("state"), error: q.get("error") }, cookie: req.cookies.get(EPIC_STATE_COOKIE)?.value });
  if (!r.ok) return done({ epic: r.reason });
  const admin = supabaseAdmin();
  if (!admin) return done({ epic: "error" });
  const outcome = await saveVerifiedEpic(admin, user.id, r.accountId);
  if (outcome === "saved" || outcome === "replaced") await recordEvent(user.id, "game_identity_linked", { source: "web", game: "ROCKET_LEAGUE" }, admin);
  // The Epic Account ID is not sent anywhere else (the Privacy Policy says Ballchasing requests carry only a replay id). The player checks
  // the match by submitting a replay, which matches by platform and id exactly.
  return done({ epic: outcome });
}
