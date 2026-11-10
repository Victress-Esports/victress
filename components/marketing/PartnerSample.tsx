"use client";

import { useState } from "react";
import { SampleTag } from "@/components/marketing/SampleTag";
import { CHALLENGE_AREAS, IMPACT_CATEGORIES, WAYS } from "@/content/partner";

/**
 * A sample of the Partner dashboard with the real section names (Partner Experience specification, section 3). Everything in it is labeled Sample:
 * the organization is not real, there are NO numbers (an empty dashboard shows measures only when records exist), and no company is named.
 * The real dashboard shows only an organization's own records.
 * Copy has no hyphens (victressesports.com rule).
 */
const TABS = ["Overview", "Challenges", "Participation", "Opportunities", "Impact"] as const;
type Tab = (typeof TABS)[number];

const tile = "rounded-xl border border-line bg-surface-2 p-4";

function Overview() {
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Partner Plan", "Supporting Partner"],
          ["Partnership status", "Active"],
          ["Verification", "Verified"],
        ].map(([k, v]) => (
          <div key={k} className={tile}>
            <p className="text-xs text-mute">{k}</p>
            <p className="mt-1 font-semibold">{v}</p>
          </div>
        ))}
      </div>
      <p className="text-sm font-semibold">Impact Summary</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {["Supported Teams", "Resources Provided", "Mentorship Hours"].map((k) => (
          <div key={k} className={tile}>
            <p className="font-semibold">{k}</p>
            <p className="mt-1 text-xs text-mute">Shown when records exist</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Challenges() {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {CHALLENGE_AREAS.map((a) => (
        <li key={a.id} className={tile}>
          <p className="font-semibold">{a.label}</p>
          <p className="mt-1 text-xs text-mute">Findings and sources</p>
        </li>
      ))}
    </ul>
  );
}

function Participation() {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {WAYS.map((w) => (
        <li key={w.id} className={tile}>
          <p className="font-semibold">{w.label}</p>
          <p className="mt-1 text-xs text-mute">Submitted, then reviewed</p>
        </li>
      ))}
    </ul>
  );
}

function Opportunities() {
  return (
    <div className={`${tile} grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center`}>
      <div>
        <p className="text-xs text-mute">Opportunity type</p>
        <p className="mt-1 font-semibold">Opportunity title</p>
        <dl className="mt-2 grid gap-1 text-sm">
          <div className="flex gap-2">
            <dt className="text-mute">Organization</dt>
            <dd>Sample Organization</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-mute">Support Needed</dt>
            <dd>Travel assistance</dd>
          </div>
        </dl>
      </div>
      <span className="inline-flex min-h-11 items-center justify-center rounded-xl bg-crimson px-5 text-sm font-semibold text-white">Offer Support</span>
    </div>
  );
}

function Impact() {
  return (
    <div className="grid gap-4">
      <ul className="grid gap-2 sm:grid-cols-2">
        {IMPACT_CATEGORIES.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm">
            <span>{c.label}</span>
            <span className="text-xs text-mute">Records</span>
          </li>
        ))}
      </ul>
      <span className="inline-flex min-h-11 w-fit items-center rounded-xl border border-line px-5 text-sm font-semibold">Download Report</span>
    </div>
  );
}

const PANELS: Record<Tab, () => React.ReactElement> = { Overview, Challenges, Participation, Opportunities, Impact };

export function PartnerSample() {
  const [tab, setTab] = useState<Tab>("Overview");
  const Panel = PANELS[tab];
  return (
    <figure className="mx-auto w-full max-w-5xl">
      <div className="overflow-hidden rounded-3xl border border-line bg-surface">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <p className="font-display text-lg font-bold">Sample Organization</p>
          <SampleTag />
        </div>
        <div role="tablist" aria-label="Partner dashboard sections" className="flex gap-1 overflow-x-auto border-b border-line px-3 py-2">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              id={`sample-tab-${t}`}
              aria-selected={tab === t}
              aria-controls="sample-panel"
              onClick={() => setTab(t)}
              className={`inline-flex min-h-11 shrink-0 items-center rounded-xl px-4 text-sm font-semibold ${tab === t ? "bg-surface-2 text-white" : "text-mute hover:text-white"}`}
            >
              {t}
            </button>
          ))}
        </div>
        <div id="sample-panel" role="tabpanel" aria-labelledby={`sample-tab-${tab}`} className="min-h-[22rem] p-5 sm:p-8">
          <Panel />
        </div>
      </div>
      <figcaption className="mt-3 text-center text-sm text-mute">Sample. Your dashboard shows your own records.</figcaption>
    </figure>
  );
}
