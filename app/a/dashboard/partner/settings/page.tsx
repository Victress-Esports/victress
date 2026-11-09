import type { Metadata } from "next";
import { ManageBillingButton, OrganizationForm, UpgradePanel } from "@/components/app/PartnerForms";
import { Section } from "@/components/ui/form";
import { PARTNER_PLANS, VERIFICATION_NOTE, isPaidPlan, planLabel } from "@/content/partner";
import { requirePartner } from "@/lib/partner";
import { partnerBillingEnabled } from "@/lib/partner-stripe";
import { privateMetadata } from "@/lib/seo";

export const metadata: Metadata = privateMetadata("Organization Settings | Victress", "Your organization's details, plan and billing.");

const BILLING_NOTES: Record<string, string> = {
  success: "Thank you. Your plan updates when Stripe confirms the payment, which is usually within a minute. Refresh this page to check.",
  cancelled: "Checkout was cancelled. Nothing was charged and your plan is unchanged.",
  off: "Paid plans are not open yet. Your organization is on Community Partner. You can upgrade here when billing opens.",
  error: "Checkout could not start. Your organization is on Community Partner. Try Upgrade again, or contact Victress.",
};

export default async function OrganizationSettings({ searchParams }: { searchParams: Promise<{ billing?: string }> }) {
  const { org, isOwner, paid } = await requirePartner();
  const { billing } = await searchParams;
  const open = partnerBillingEnabled();
  const plan = PARTNER_PLANS.find((p) => p.id === org.plan);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-4xl font-bold">Organization Settings</h1>
      {billing && BILLING_NOTES[billing] ? (
        <p role="status" className="rounded-xl border border-line bg-surface px-4 py-3 text-sm text-mute">
          {BILLING_NOTES[billing]}
        </p>
      ) : null}

      <Section title="Organization">
        <OrganizationForm name={org.name} type={org.org_type} website={org.website ?? ""} canEdit={isOwner} />
        <p className="mt-4 text-sm text-mute">
          {org.verified ? "Verified." : "Not verified yet."} {VERIFICATION_NOTE} Changing the name or website clears verification until it is checked again.
        </p>
      </Section>

      <Section title="Partner Plan" line={`${planLabel(org.plan)}${org.billing_interval ? `, billed ${org.billing_interval === "annual" ? "annually" : "monthly"}` : ""}.`}>
        {plan ? (
          <ul className="flex list-disc flex-col gap-1 pl-5 text-mute">
            {plan.includes.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        ) : null}
        {org.subscription_status && isPaidPlan(org.plan) && !paid ? (
          <p className="mt-4 text-sm text-mute">Subscription status: {org.subscription_status.replace("_", " ")}. Paid features are available while the subscription is active.</p>
        ) : null}

        <div className="mt-6">
          {!isOwner ? (
            <p className="text-sm text-mute">Only the owner can change the plan or billing.</p>
          ) : org.plan === "community" ? (
            open ? (
              <UpgradePanel />
            ) : (
              <p className="text-sm text-mute">Paid plans are not open yet. Upgrade will appear here when billing opens.</p>
            )
          ) : open || org.subscription_status ? (
            <ManageBillingButton />
          ) : null}
          {isOwner && org.plan === "anchor" ? <p className="mt-3 text-sm text-mute">Initiatives and category exclusivity are arranged directly with the Victress team.</p> : null}
        </div>
      </Section>
    </div>
  );
}
