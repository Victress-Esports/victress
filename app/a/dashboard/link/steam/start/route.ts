import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { scrimUploadsEnabled } from "@/lib/dashboard";
import { STEAM_COOKIE_PATH, STEAM_STATE_COOKIE, steamLoginUrl, steamServerConfig, steamStateCookie } from "@/lib/steam";
import { VERIFY_NEXT_COOKIE } from "@/lib/verify-return";

/** Starts Steam verification for the signed in pilot player: a fresh state bound to this account, then Steam's sign in page. */
export async function GET(req: NextRequest) {
  const cfg = steamServerConfig();
  if (!cfg || !scrimUploadsEnabled()) return new NextResponse(null, { status: 404 });
  const { sb, user } = await requireUser();
  const { data: approved } = await sb.rpc("upload_allowed");
  if (approved !== true) return new NextResponse(null, { status: 404 });
  const state = randomBytes(32).toString("hex");
  const res = NextResponse.redirect(steamLoginUrl(cfg, state));
  const opts = { httpOnly: true, secure: true, sameSite: "lax" as const, maxAge: 600 };
  res.cookies.set(STEAM_STATE_COOKIE, steamStateCookie(state, user.id), { ...opts, path: STEAM_COOKIE_PATH });
  res.cookies.set(VERIFY_NEXT_COOKIE, req.nextUrl.searchParams.get("next") === "claim" ? "claim" : "", { ...opts, path: "/dashboard/link" });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
