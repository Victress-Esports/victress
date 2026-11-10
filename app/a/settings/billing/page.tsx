import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { CheckoutButton, PortalButton } from "@/components/app/PlayerBilling";
import { PLANS, SCOUT_BUYER_NOTE, formatUsd } from "@/content/pricing";
import { grantsPlan, hasTestKey, playerBillingEnabled, GRACE_DAYS } from "@/lib/billing";
import { currentTier, planName } from "@/lib/entitlements";
import { privateMetadata } from "@/lib/seo";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = privateMetadata("Plan and billing | Victress", "Your Victress plan and billing.");
export const dynamic = "force-dynamic";

const NOTES: Record<string, string> = {
  success: "Thank you. Your plan updates when Stripe confirms the payment, which is usually within a minute. Refresh this page to check.",
  cancelled: "Checkout was cancelled. Nothing was charged and your plan is unchanged.",
};

const date = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

/** Hidden completely (404) while NEXT_PUBLIC_BILLING_ENABLED is not "true": Production today. */
export default async function PlayerBilling({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  if (!playerBillingEnabled()) notFound();
  // Signed out (for example from a pricing page button): sign in, then come back here.
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login?next=/settings/billing");
  const { checkout } = await searchParams;
  const tier = await currentTier();
  const { data: rows } = await sb
    .from("subscriptions")
    .select("plan, billing_interval, status, current_period_end, cancel_at_period_end, payment_failed_at")
    .order("updated_at", { ascending: false });
  const active = (rows ?? []).find((r) => grantsPlan(r)) ?? null;
  const admin = supabaseAdmin();
  const { data: cust } = admin ? await admin.from("billing_customers").select("profile_id").eq("profile_id", user.id).maybeSingle() : { data: null };
  const testMode = hasTestKey();

  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-8 px-4 py-12">
      <Logo href="/dashboard" />
      <div>
        <h1 className="font-display text-4xl font-bold leading-tight">Plan and billing</h1>
        <p className="mt-3 text-mute">
          Your plan is <span className="font-semibold text-white">{planName(tier)}</span>.
          {active?.current_period_end ? ` ${active.cancel_at_period_end ? "Ends" : "Renews"} ${date(active.current_period_end)}.` : ""}
        </p>
        {active?.status === "past_due" ? (
          <p className="mt-2 text-sm text-mute">Your last payment failed. Your plan stays for {GRACE_DAYS} days from the first failure while you update your payment method.</p>
        ) : null}
        <p className="mt-2 text-sm">
          <Link href="/dashboard" className="underline underline-offset-2">
            Back to the dashboard
          </Link>
        </p>
      </div>

      {checkout && NOTES[checkout] ? (
        <p role="status" className="rounded-xl border border-line bg-surface px-4 py-3 text-sm text-mute">
          {NOTES[checkout]}
        </p>
      ) : null}
      {!testMode ? <p className="rounded-xl border border-line bg-surface px-4 py-3 text-sm text-mute">Billing is only available in Stripe test mode right now.</p> : null}

      <ul className="grid gap-4">
        {PLANS.filter((p) => p.id !== "rookie").map((p) => {
          const current = tier === p.id;
          return (
            <li key={p.id} className={`rounded-2xl border p-5 ${current ? "border-white bg-surface-2" : "border-line bg-surface"}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-display text-2xl font-bold">{p.name}</h2>
                <p>
                  <span className="font-display text-2xl font-bold">{formatUsd(p.monthly)}</span> <span className="text-mute">{p.unit}</span>
                  {p.yearly ? <span className="text-mute">, or {formatUsd(p.yearly)} per year</span> : null}
                </p>
              </div>
              <p className="mt-2 text-mute">{p.blurb}</p>
              {p.id === "scout" ? <p className="mt-2 text-sm text-mute">{SCOUT_BUYER_NOTE}</p> : null}
              {current ? (
                <p className="mt-4 text-sm font-semibold">Your current plan</p>
              ) : active ? null : (
                <div className="mt-4 flex flex-wrap gap-3">
                  <CheckoutButton plan={p.id} interval="month" label={`Choose ${p.name} monthly`} />
                  {p.yearly ? <CheckoutButton plan={p.id} interval="year" label={`Choose ${p.name} annual`} /> : null}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-sm text-mute">Features marked Coming soon, such as Scrim Intelligence and Scout Desk, are not available yet.</p>

      {cust || active ? <PortalButton /> : null}
    </main>
  );
}
