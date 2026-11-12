import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PLACEHOLDER_HANDLE, safeNext } from "@/lib/auth";
import { consentStatus, needsConsent } from "@/lib/consent";
import { sendWelcome } from "@/lib/email";
import { checkHandle } from "@/lib/handles";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const fail = () => NextResponse.redirect(new URL("/login?error=1", url.origin));

  const code = url.searchParams.get("code");
  if (!code || url.searchParams.get("error")) return fail();

  const sb = await supabaseServer();
  const { error } = await sb.auth.exchangeCodeForSession(code);
  if (error) return fail();

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return fail();

  const store = await cookies();
  const cookieClaim = store.get("v_claim")?.value;
  const next = safeNext(decodeURIComponent(store.get("v_next")?.value ?? ""), "");
  store.delete("v_claim");

  // Apply the handle claimed on the marketing site (cookie, or user metadata for magic links opened elsewhere).
  const wanted = decodeURIComponent(cookieClaim ?? "") || String(user.user_metadata?.claim ?? "");
  if (wanted && checkHandle(wanted).verdict === "ok") {
    await sb.rpc("claim_handle", { p_handle: wanted });
  }

  const { data: profile } = await sb.from("profiles").select("handle, game").eq("id", user.id).single();
  const handle = profile?.handle ?? "";
  const needsName = PLACEHOLDER_HANDLE.test(handle);

  // First sign-in: send the welcome email once.
  if (user.email && !needsName && !user.user_metadata?.welcomed) {
    await sendWelcome(user.email, handle).catch((e) => console.error("welcome email failed", e));
    await sb.auth.updateUser({ data: { welcomed: true } });
  }

  // First sign in, or the Terms or Privacy Policy changed: age and acceptance come before anything else. v_next stays for later.
  if (needsConsent((await consentStatus(sb, user.id)).status)) return NextResponse.redirect(new URL("/consent", url.origin));

  const onboarded = !!user.user_metadata?.onboarded;
  if (onboarded) store.delete("v_next"); // otherwise onboarding finishes the trip to it
  const dest = needsName ? "/onboarding?step=name" : onboarded ? next || "/dashboard" : "/onboarding";
  return NextResponse.redirect(new URL(dest, url.origin));
}
