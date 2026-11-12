import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { LEGAL_DOCUMENTS, LEGAL_VERSIONS } from "@/content/legal-versions";
import { isMissingTable } from "@/lib/db-errors";
import type { Database } from "@/types/database";

/**
 * ok: age confirmed and the current Terms and Privacy accepted.
 * needs_age: no age confirmation yet (first sign in). needs_acceptance: a document's current version is not accepted
 * (first sign in, or the document changed). unavailable: the tables are not in this database yet (migration not applied),
 * so the gate cannot be enforced; the app keeps working as it did before the migration.
 */
export type ConsentStatus = "ok" | "needs_age" | "needs_acceptance" | "unavailable";

export async function consentStatus(sb: SupabaseClient<Database>, userId: string): Promise<{ status: ConsentStatus; returning: boolean }> {
  const [age, acc] = await Promise.all([
    sb.from("age_confirmations").select("profile_id").eq("profile_id", userId).maybeSingle(),
    sb.from("legal_acceptances").select("document, version").eq("profile_id", userId),
  ]);
  if (isMissingTable(age.error) || isMissingTable(acc.error)) return { status: "unavailable", returning: false };
  // Any other failure: do not wave anyone through, and do not lock out a working account on a transient error either.
  if (age.error || acc.error) throw new Error("consent status unavailable");
  const rows = acc.data ?? [];
  const returning = rows.length > 0;
  if (!age.data) return { status: "needs_age", returning };
  const accepted = new Set(rows.map((r) => `${r.document}:${r.version}`));
  const missing = LEGAL_DOCUMENTS.some((d) => !accepted.has(`${d}:${LEGAL_VERSIONS[d]}`));
  return { status: missing ? "needs_acceptance" : "ok", returning };
}

export const needsConsent = (s: ConsentStatus) => s === "needs_age" || s === "needs_acceptance";
