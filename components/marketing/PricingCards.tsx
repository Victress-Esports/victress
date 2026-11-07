"use client";

import { useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { WaitlistButton } from "@/components/marketing/WaitlistButton";
import { copy } from "@/content/copy";
import { PLANS, formatUsd } from "@/content/pricing";
import { appUrl } from "@/lib/urls";

export function PricingCards() {
  const [annual, setAnnual] = useState(false);
  const p = copy.pricing;

  return (
    <div>
      <div className="flex justify-center">
        <div role="group" aria-label="Billing period" className="inline-flex rounded-xl border border-line bg-surface p-1">
          {[
            [false, p.monthly],
            [true, p.annual],
          ].map(([val, label]) => (
            <button
              key={String(label)}
              type="button"
              aria-pressed={annual === val}
              onClick={() => setAnnual(val as boolean)}
              className={`min-h-11 rounded-lg px-5 text-sm font-semibold ${annual === val ? "bg-crimson text-white" : "text-mute hover:text-white"}`}
            >
              {label as string}
            </button>
          ))}
        </div>
      </div>
      <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan) => {
          const showYear = annual && plan.yearly !== undefined;
          const price = showYear ? plan.yearly! : plan.monthly;
          return (
            <li
              key={plan.id}
              className={`lift flex flex-col rounded-3xl border p-6 ${plan.highlight ? "border-crimson bg-surface" : "border-line bg-surface"}`}
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-bold">{plan.name}</h2>
                {!plan.live ? (
                  <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-coral">{p.soonBadge}</span>
                ) : null}
              </div>
              <p className="mt-4 flex items-baseline gap-2">
                <span className="tnum font-display text-4xl font-bold">{formatUsd(price)}</span>
                <span className="text-sm text-mute">{showYear ? "per year" : plan.unit}</span>
              </p>
              <p className="mt-4 flex-1 text-mute">{plan.blurb}</p>
              {plan.note ? <p className="mt-4 text-sm text-mute">{plan.note}</p> : null}
              <div className="mt-6">
                {plan.live ? (
                  <ButtonLink href={appUrl("/login", "pricing_rookie_start_free")} className="w-full">
                    {p.liveCta}
                  </ButtonLink>
                ) : (
                  <WaitlistButton interest={plan.interest!} label={p.soonCta} className="w-full" />
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
