import type { Metadata } from "next";
import { ExclusivityActions, ExclusivityRequestForm, ManageBillingButton, OrganizationForm, UpgradePanel } from "@/components/app/PartnerForms";
import { PartnerPlanList } from "@/components/app/PartnerPlans";
import { Section } from "@/components/ui/form";
import { VERIFICATION_NOTE, isPaidPlan, planLabel } from "@/content/partner";
import { requirePartner } from "@/lib/partner";
import { partnerBillingEnabled } from "@/lib/partner-stripe";
import { privateMetadata } from "@/lib/seo";

export const metadata: Metadata = privateMetadata("Organization Settings | Victress", "Your organization's details, plan and billing.");

const BILLING_NOTES: Record<string, string> = {
  success: "Thank you. Your plan updates when Stripe confirms the payment, which is usually within a minute. Refresh this page to check.",
  cancelled: "Checkout was cancelled. Nothing was charged and your plan is unchanged.",
  off: "Paid plans are not open yet. Your organization is on Community Partner. You can upgrade here when billing opens.",
  error: "Checkout could not start. Your organization is on Community Partner. Try Upgrade again in a moment.",
};

export default async function OrganizationSettings({ searchParams }: { searchParams: Promise<{ billing?: string }> }) {
  const { org, isOwner, paid, plan, exclusivity, allowed } = await requirePartner();
  const { billing } = await searchParams;
  const open = partnerBillingEnabled();

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

      <Section title="Partner Plan" line={`${planLabel(plan)}${org.billing_interval ? `, billed ${org.billing_interval === "annual" ? "annually" : "monthly"}` : ""}.`}>
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
        </div>
      </Section>

      {org.plan === "anchor" || exclusivity ? (
        <Section title="Category Exclusivity" line="An exclusive category within the Victress platform and its events and initiatives. Victress approves each category so it is never sold twice, then you pay by Stripe invoice.">
          {exclusivity ? (
            <div className="flex flex-col gap-3">
              <dl className="grid gap-3 sm:grid-cols-3">
                <div>
                  <dt className="text-sm text-mute">Category</dt>
                  <dd className="mt-1 font-semibold">{exclusivity.category}</dd>
                </div>
                <div>
                  <dt className="text-sm text-mute">Duration</dt>
                  <dd className="mt-1 font-semibold">{exclusivity.duration_months / 12 === 1 ? "1 year" : `${exclusivity.duration_months / 12} years`}</dd>
                </div>
                <div>
                  <dt className="text-sm text-mute">Status</dt>
                  <dd className="mt-1 font-semibold">
                    {exclusivity.status === "requested" ? "In review" : exclusivity.status === "approved" ? (exclusivity.invoice_status === "payment_failed" ? "Approved, payment failed" : "Approved, waiting for payment") : "Active"}
                  </dd>
                </div>
              </dl>
              {exclusivity.status === "active" && exclusivity.ends_at ? (
                <p className="text-sm text-mute">Active until {new Date(exclusivity.ends_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}. Price: $85,000 per year.</p>
              ) : null}
              {exclusivity.status === "approved" ? (
                <p className="text-sm text-mute">Your category is reserved for you. Pay the invoice ($85,000 per year) by card, ACH or bank transfer. Exclusivity starts when Stripe confirms the payment.</p>
              ) : null}
              {isOwner && exclusivity.status !== "active" ? (
                <ExclusivityActions id={exclusivity.id} status={exclusivity.status} hasInvoice={!!exclusivity.invoice_url} billingOpen={open} />
              ) : null}
            </div>
          ) : isOwner && allowed("request_exclusivity") ? (
            <ExclusivityRequestForm />
          ) : (
            <p className="text-sm text-mute">{isOwner ? "Category Exclusivity can be requested once your Anchor Partner plan is active." : "Only the owner can request Category Exclusivity."}</p>
          )}
        </Section>
      ) : null}

      <Section title="All plans" line="Every benefit of every plan, and whether it is available today.">
        <PartnerPlanList current={plan} />
      </Section>
    </div>
  );
}
