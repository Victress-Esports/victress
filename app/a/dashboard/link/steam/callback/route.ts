import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { scrimUploadsEnabled } from "@/lib/dashboard";
import { saveVerifiedIdentity } from "@/lib/epic";
import { recordEvent } from "@/lib/events";
import { STEAM_COOKIE_PATH, STEAM_STATE_COOKIE, steamServerConfig, verifySteamCallback } from "@/lib/steam";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { VERIFY_NEXT_COOKIE, verifyDestination } from "@/lib/verify-return";

export const maxDuration = 30;

/** Steam returns here. The SteamID64 is used only after Steam itself confirms the response. The page shows a fixed message only. */
export async function GET(req: NextRequest) {
  const cfg = steamServerConfig();
  if (!cfg || !scrimUploadsEnabled()) return new NextResponse(null, { status: 404 });
  const { sb, user } = await requireUser();
  const { data: approved } = await sb.rpc("upload_allowed");
  if (approved !== true) return new NextResponse(null, { status: 404 });

  const dest = verifyDestination(req.cookies.get(VERIFY_NEXT_COOKIE)?.value);
  const done = (outcome: string) => {
    const res = NextResponse.redirect(new URL(`${dest}?steam=${outcome}`, new URL(cfg.returnUrl).origin));
    const gone = { httpOnly: true, secure: true, sameSite: "lax" as const, maxAge: 0 };
    res.cookies.set(STEAM_STATE_COOKIE, "", { ...gone, path: STEAM_COOKIE_PATH });
    res.cookies.set(VERIFY_NEXT_COOKIE, "", { ...gone, path: "/dashboard/link" });
    res.headers.set("Cache-Control", "no-store");
    return res;
  };
  const r = await verifySteamCallback({ cfg, profileId: user.id, query: req.nextUrl.searchParams, cookie: req.cookies.get(STEAM_STATE_COOKIE)?.value });
  if (!r.ok) return done(r.reason);
  const admin = supabaseAdmin();
  if (!admin) return done("error");
  const outcome = await saveVerifiedIdentity(admin, user.id, { platform: "steam", id: r.steamId, via: "steam_openid" });
  if (outcome === "saved" || outcome === "replaced") await recordEvent(user.id, "game_identity_linked", { source: "web", game: "ROCKET_LEAGUE" }, admin);
  return done(outcome);
}
