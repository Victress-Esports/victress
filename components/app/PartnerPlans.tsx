import { PARTNER_PLANS, STATUS_LABEL, type PartnerPlanId } from "@/content/partner";

/** Every plan with every benefit and its status, from the central configuration. Nothing approved is hidden because it is not built yet. */
export function PartnerPlanList({ current, className = "" }: { current?: PartnerPlanId; className?: string }) {
  return (
    <ul className={`grid gap-4 ${className}`}>
      {PARTNER_PLANS.map((pl) => (
        <li key={pl.id} className={`rounded-2xl border p-5 ${current === pl.id ? "border-white bg-surface-2" : "border-line bg-surface"}`}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-display text-xl font-bold">{pl.name}</h3>
            <p>
              <span className="font-display text-2xl font-bold">{pl.price}</span> <span className="text-mute">{pl.priceLine}</span>
            </p>
          </div>
          {pl.includes ? <p className="mt-2 text-sm text-mute">Everything in {PARTNER_PLANS.find((p) => p.id === pl.includes)?.name}, plus:</p> : null}
          <ul className="mt-3 flex flex-col gap-2">
            {pl.benefits.map((b) => (
              <li key={b.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
                <span className="max-w-prose">{b.label}</span>
                <span className={`rounded-full border px-2 py-0.5 text-xs ${b.status === "implemented" ? "border-white text-white" : "border-line text-mute"}`}>{STATUS_LABEL[b.status]}</span>
                {b.note ? <span className="basis-full text-mute">{b.note}</span> : null}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
