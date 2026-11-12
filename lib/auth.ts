import "server-only";
import { redirect } from "next/navigation";
import { consentStatus, needsConsent } from "@/lib/consent";
import { supabaseServer } from "@/lib/supabase/server";

export { PLACEHOLDER_HANDLE } from "@/lib/handles";

/**
 * Use at the top of any signed-in page or action. Redirects to /login when there is no session, and to /consent until the
 * player has confirmed their age and accepted the current Terms and Privacy Policy (also again after either changes).
 * Only the consent page and its action pass `{ gate: false }`.
 */
export async function requireUser(opts: { gate?: boolean } = {}) {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login");
  if (opts.gate !== false && needsConsent((await consentStatus(sb, user.id)).status)) redirect("/consent");
  return { sb, user };
}

/** Only allow same-site relative paths as post-login destinations. */
export function safeNext(next: string | null | undefined, fallback = "/dashboard") {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : fallback;
}
