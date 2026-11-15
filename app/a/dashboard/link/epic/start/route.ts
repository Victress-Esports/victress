import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { scrimUploadsEnabled } from "@/lib/dashboard";
import { EPIC_COOKIE_PATH, EPIC_STATE_COOKIE, authorizeUrl, epicServerConfig, stateCookieValue } from "@/lib/epic";
import { VERIFY_NEXT_COOKIE } from "@/lib/verify-return";

/** Starts Epic verification for the signed in pilot player: a fresh state bound to this account, then Epic's sign in page. */
export async function GET(req: NextRequest) {
  const cfg = epicServerConfig();
  if (!cfg || !scrimUploadsEnabled()) return new NextResponse(null, { status: 404 });
  const { sb, user } = await requireUser();
  const { data: approved } = await sb.rpc("upload_allowed");
  if (approved !== true) return new NextResponse(null, { status: 404 });
  const state = randomBytes(32).toString("hex");
  const res = NextResponse.redirect(authorizeUrl(cfg, state));
  res.cookies.set(EPIC_STATE_COOKIE, stateCookieValue(state, user.id), { httpOnly: true, secure: true, sameSite: "lax", path: EPIC_COOKIE_PATH, maxAge: 600 });
  res.cookies.set(VERIFY_NEXT_COOKIE, req.nextUrl.searchParams.get("next") === "claim" ? "claim" : "", { httpOnly: true, secure: true, sameSite: "lax", path: "/dashboard/link", maxAge: 600 });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
