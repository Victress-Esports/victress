import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { PartnerSignupForm } from "@/components/app/PartnerForms";
import { PartnerPlanList } from "@/components/app/PartnerPlans";
import { loadPartner } from "@/lib/partner";
import { partnerBillingEnabled } from "@/lib/partner-stripe";
import { privateMetadata } from "@/lib/seo";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = privateMetadata("Become a Partner | Victress", "Create a Partner organization on Victress.");

/** /partner: signed out goes to sign in and comes back here. A member goes to their dashboard. Anyone else sees the signup form. */
export default async function BecomePartner() {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login?next=/partner");

  const p = await loadPartner(); // sends an account that has not finished onboarding there first
  if (p.org) redirect("/dashboard/partner");

  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-8 px-4 py-12">
      <Logo href="/dashboard" />
      <div>
        <h1 className="font-display text-4xl font-bold leading-tight">Become a Partner.</h1>
        <p className="mt-3 text-mute">
          Partner is an account for organizations: universities, companies, esports organizations, leagues, community groups and nonprofits. Create your organization, then
          take part in addressing the barriers women competitors face in esports.
        </p>
      </div>
      {p.available ? (
        <PartnerSignupForm billingOpen={partnerBillingEnabled()} />
      ) : (
        <p className="rounded-2xl border border-line bg-surface p-5 text-mute">Partner accounts are not open yet.</p>
      )}
      <PartnerPlanList />
      <p className="text-sm text-mute">Category Exclusivity is requested by an Anchor Partner from Organization Settings once the plan is active. Victress approves the category, then you pay by Stripe invoice.</p>
    </main>
  );
}
