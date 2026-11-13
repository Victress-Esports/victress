"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { LEGAL_DOCUMENTS, LEGAL_VERSIONS, MINIMUM_AGE } from "@/content/legal-versions";
import { deleteAccount } from "@/lib/account";
import { safeNext, requireUser } from "@/lib/auth";
import { ageOn } from "@/lib/age";
import { consentStatus } from "@/lib/consent";

export type ConsentResult = { ok: false; message: string; underage?: boolean };

const schema = z.object({
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  accepted: z.literal(true),
});

/**
 * Records the age confirmation (first time only) and acceptance of the current Terms and Privacy Policy versions.
 * Under the minimum age: the account is deleted and the person is signed out. The date of birth is never stored for them.
 */
export async function submitConsentAction(input: z.input<typeof schema>): Promise<ConsentResult> {
  const { sb, user } = await requireUser({ gate: false });
  const p = schema.safeParse(input);
  if (!p.success) return { ok: false, message: "Please accept the Terms and the Privacy Policy to continue." };

  const { status } = await consentStatus(sb, user.id);
  if (status === "unavailable") redirect("/dashboard");

  if (status === "needs_age") {
    if (!p.data.birthDate) return { ok: false, message: "Enter your date of birth." };
    const age = ageOn(p.data.birthDate);
    if (age === null) return { ok: false, message: "Enter a real date of birth." };
    if (age < MINIMUM_AGE) {
      await deleteAccount(user.id, user.email);
      await sb.auth.signOut();
      return { ok: false, underage: true, message: `You must be ${MINIMUM_AGE} or older to use Victress.` };
    }
    const { error } = await sb.from("age_confirmations").insert({ profile_id: user.id, birth_date: p.data.birthDate });
    if (error && error.code !== "23505") {
      // The database refuses under 13 itself, in case the check above was bypassed.
      if (error.message.includes("under_minimum_age")) {
        await deleteAccount(user.id, user.email);
        await sb.auth.signOut();
        return { ok: false, underage: true, message: `You must be ${MINIMUM_AGE} or older to use Victress.` };
      }
      return { ok: false, message: "Something went wrong. Try again." };
    }
  }

  const rows = LEGAL_DOCUMENTS.map((document) => ({ profile_id: user.id, document, version: LEGAL_VERSIONS[document] }));
  for (const row of rows) {
    const { error } = await sb.from("legal_acceptances").insert(row);
    if (error && error.code !== "23505") return { ok: false, message: "Something went wrong. Try again." };
  }

  const store = await cookies();
  if (user.user_metadata?.onboarded) {
    const next = safeNext(decodeURIComponent(store.get("v_next")?.value ?? ""), "/dashboard");
    store.delete("v_next");
    redirect(next);
  }
  redirect("/onboarding"); // onboarding finishes the trip to an invite link kept in v_next
}

export async function signOutFromConsentAction() {
  const { sb } = await requireUser({ gate: false });
  await sb.auth.signOut();
  redirect("/");
}
