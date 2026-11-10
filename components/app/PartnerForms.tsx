"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { buttonClass } from "@/components/ui/Button";
import { FormMessage, inputClass } from "@/components/ui/form";
import {
  OPPORTUNITY_TYPES,
  ORG_TYPES,
  SIGNUP_PLANS,
  WAYS,
  type PartnerInterval,
  type SignupPlanId,
} from "@/content/partner";
import { createPartnerOrgAction } from "@/app/a/partner/actions";
import {
  offerSupportAction,
  requestExclusivityAction,
  startExclusivityInvoiceAction,
  withdrawExclusivityAction,
  openBillingPortalAction,
  startUpgradeAction,
  submitOpportunityAction,
  submitParticipationAction,
  updateOrganizationAction,
  type Result,
} from "@/app/a/dashboard/partner/actions";

function Labeled({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      {children}
      {hint ? <p className="text-sm text-mute">{hint}</p> : null}
    </div>
  );
}

const areaClass = `${inputClass} min-h-28 py-3`;

/** Plan and interval choice, shared by signup and the Upgrade panel. Community is only offered when `withCommunity`. */
function PlanPicker({
  plan, interval, onPlan, onInterval, withCommunity,
}: {
  plan: SignupPlanId; interval: PartnerInterval; onPlan: (p: SignupPlanId) => void; onInterval: (i: PartnerInterval) => void; withCommunity: boolean;
}) {
  const plans = SIGNUP_PLANS.filter((p) => withCommunity || p.id !== "community");
  const current = SIGNUP_PLANS.find((p) => p.id === plan)!;
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-sm font-semibold">Plan</legend>
      <div className="grid gap-3 sm:grid-cols-3">
        {plans.map((p) => (
          <label key={p.id} className={`flex min-h-12 cursor-pointer flex-col gap-1 rounded-2xl border p-4 ${plan === p.id ? "border-white bg-surface-2" : "border-line bg-surface"}`}>
            <span className="flex items-center gap-2">
              <input type="radio" name="plan" value={p.id} checked={plan === p.id} onChange={() => onPlan(p.id)} />
              <span className="font-semibold">{p.name}</span>
            </span>
            <span className="text-sm text-mute">
              {p.price} {p.priceLine}
            </span>
          </label>
        ))}
      </div>
      {current.intervals.length > 0 ? (
        <Labeled id="partner-interval" label="Billing interval">
          <select id="partner-interval" value={current.intervals.includes(interval) ? interval : current.intervals[0]} onChange={(e) => onInterval(e.target.value as PartnerInterval)} disabled={current.intervals.length === 1} className={inputClass}>
            {current.intervals.includes("monthly") ? <option value="monthly">Monthly, $1,000 per month</option> : null}
            <option value="annual">{current.id === "anchor" ? "Annual, $50,000 per year" : "Annual, $10,000 per year"}</option>
          </select>
        </Labeled>
      ) : null}
    </fieldset>
  );
}

export function PartnerSignupForm({ billingOpen }: { billingOpen: boolean }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [website, setWebsite] = useState("");
  const [plan, setPlan] = useState<SignupPlanId>("community");
  const [interval, setInterval] = useState<PartnerInterval>("monthly");
  const [authorized, setAuthorized] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    start(async () => {
      const iv = plan === "anchor" ? "annual" : interval;
      const r = await createPartnerOrgAction({ name, type: type as never, website, plan, interval: iv, authorized: authorized as true });
      // On success the action redirects, so a result only comes back for a problem.
      if (r && !r.ok) setMsg(r.message);
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <Labeled id="org-name" label="Organization name">
        <input id="org-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required className={inputClass} />
      </Labeled>
      <Labeled id="org-type" label="Organization type">
        <select id="org-type" value={type} onChange={(e) => setType(e.target.value)} required className={inputClass}>
          <option value="" disabled>
            Choose a type
          </option>
          {ORG_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </Labeled>
      <Labeled id="org-website" label="Website" hint="Optional.">
        <input id="org-website" value={website} onChange={(e) => setWebsite(e.target.value)} maxLength={200} inputMode="url" placeholder="https://example.org" className={inputClass} />
      </Labeled>
      <PlanPicker plan={plan} interval={interval} onPlan={setPlan} onInterval={setInterval} withCommunity />
      {plan !== "community" && !billingOpen ? (
        <p className="rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm text-mute">
          Paid plans are not open yet. Your organization will start on Community Partner, and you can upgrade from Organization Settings when billing opens.
        </p>
      ) : null}
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" checked={authorized} onChange={(e) => setAuthorized(e.target.checked)} className="mt-1 size-5" />
        <span>
          I am authorized to act for this organization and I accept the{" "}
          <a href="/terms" className="font-semibold underline underline-offset-2">
            Terms
          </a>
          .
        </span>
      </label>
      <button type="submit" disabled={pending || name.trim().length < 2 || !type || !authorized} className={buttonClass("primary", "w-full sm:w-auto")}>
        {pending ? "Creating…" : plan === "community" ? "Create organization" : billingOpen ? "Continue to checkout" : "Create organization"}
      </button>
      <FormMessage message={msg} />
    </form>
  );
}

function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);
  const run = (fn: () => Promise<Result | void>, after?: () => void) =>
    start(async () => {
      setMsg("");
      const r = await fn();
      if (!r) return;
      setMsg(r.message ?? "");
      setOk(r.ok);
      if (r.ok) {
        after?.();
        router.refresh();
      }
    });
  return { pending, msg, ok, run };
}

export function ParticipationForm() {
  const { pending, msg, run } = useAction();
  const [way, setWay] = useState("resources");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run(() => submitParticipationAction({ way: way as never, title, description }), () => (setTitle(""), setDescription("")));
      }}
      className="flex flex-col gap-4"
    >
      <Labeled id="way" label="Way to participate">
        <select id="way" value={way} onChange={(e) => setWay(e.target.value)} className={inputClass}>
          {WAYS.map((w) => (
            <option key={w.id} value={w.id}>
              {w.label}
            </option>
          ))}
        </select>
      </Labeled>
      <Labeled id="p-title" label="Title">
        <input id="p-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required className={inputClass} />
      </Labeled>
      <Labeled id="p-desc" label="What you can offer" hint="Say what, how much and for whom. Victress reviews every submission.">
        <textarea id="p-desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} required className={areaClass} />
      </Labeled>
      <button type="submit" disabled={pending || title.trim().length < 3 || description.trim().length < 10} className={buttonClass("primary", "w-full sm:w-auto")}>
        {pending ? "Submitting…" : "Submit"}
      </button>
      <FormMessage message={msg} />
    </form>
  );
}

export function OpportunityForm() {
  const { pending, msg, run } = useAction();
  const [type, setType] = useState("team_development");
  const [title, setTitle] = useState("");
  const [purpose, setPurpose] = useState("");
  const [support, setSupport] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run(() => submitOpportunityAction({ type: type as never, title, purpose, support_needed: support }), () => (setTitle(""), setPurpose(""), setSupport("")));
      }}
      className="flex flex-col gap-4"
    >
      <Labeled id="o-type" label="Type">
        <select id="o-type" value={type} onChange={(e) => setType(e.target.value)} className={inputClass}>
          {OPPORTUNITY_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </Labeled>
      <Labeled id="o-title" label="Title">
        <input id="o-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required className={inputClass} />
      </Labeled>
      <Labeled id="o-purpose" label="Purpose" hint="What this is for and who it helps.">
        <textarea id="o-purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} maxLength={1000} required className={areaClass} />
      </Labeled>
      <Labeled id="o-support" label="Support needed" hint="What would make it possible: funds, expertise, equipment, facilities or people.">
        <textarea id="o-support" value={support} onChange={(e) => setSupport(e.target.value)} maxLength={1000} required className={areaClass} />
      </Labeled>
      <button type="submit" disabled={pending || title.trim().length < 3 || purpose.trim().length < 10 || support.trim().length < 5} className={buttonClass("primary", "w-full sm:w-auto")}>
        {pending ? "Submitting…" : "Submit for review"}
      </button>
      <p className="text-sm text-mute">Your opportunity stays In review until Victress publishes it.</p>
      <FormMessage message={msg} />
    </form>
  );
}

export function OfferSupportForm({ opportunityId }: { opportunityId: string }) {
  const { pending, msg, run } = useAction();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("resources");
  const [message, setMessage] = useState("");
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={buttonClass("secondary", "mt-4")}>
        Offer Support
      </button>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run(() => offerSupportAction({ opportunity_id: opportunityId, support_type: type as never, message }), () => setOpen(false));
      }}
      className="mt-4 flex flex-col gap-3 border-t border-line pt-4"
    >
      <Labeled id={`s-type-${opportunityId}`} label="Type of support">
        <select id={`s-type-${opportunityId}`} value={type} onChange={(e) => setType(e.target.value)} className={inputClass}>
          {WAYS.map((w) => (
            <option key={w.id} value={w.id}>
              {w.label}
            </option>
          ))}
        </select>
      </Labeled>
      <Labeled id={`s-msg-${opportunityId}`} label="What you can offer">
        <textarea id={`s-msg-${opportunityId}`} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} required className={areaClass} />
      </Labeled>
      <div className="flex gap-2">
        <button type="submit" disabled={pending || message.trim().length < 10} className={buttonClass("primary")}>
          {pending ? "Sending…" : "Send offer"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={buttonClass("ghost")}>
          Cancel
        </button>
      </div>
      <FormMessage message={msg} />
    </form>
  );
}

export function OrganizationForm({ name, type, website, canEdit }: { name: string; type: string; website: string; canEdit: boolean }) {
  const { pending, msg, run } = useAction();
  const [n, setN] = useState(name);
  const [t, setT] = useState(type);
  const [w, setW] = useState(website);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run(() => updateOrganizationAction({ name: n, type: t as never, website: w }));
      }}
      className="flex flex-col gap-4"
    >
      <Labeled id="s-name" label="Organization name">
        <input id="s-name" value={n} onChange={(e) => setN(e.target.value)} maxLength={80} disabled={!canEdit} required className={inputClass} />
      </Labeled>
      <Labeled id="s-type" label="Organization type">
        <select id="s-type" value={t} onChange={(e) => setT(e.target.value)} disabled={!canEdit} className={inputClass}>
          {ORG_TYPES.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </Labeled>
      <Labeled id="s-site" label="Website">
        <input id="s-site" value={w} onChange={(e) => setW(e.target.value)} maxLength={200} inputMode="url" disabled={!canEdit} className={inputClass} />
      </Labeled>
      {canEdit ? (
        <button type="submit" disabled={pending || n.trim().length < 2} className={buttonClass("primary", "w-full sm:w-auto")}>
          {pending ? "Saving…" : "Save"}
        </button>
      ) : (
        <p className="text-sm text-mute">Only the owner can change these details.</p>
      )}
      <FormMessage message={msg} />
    </form>
  );
}

export function UpgradePanel() {
  const { pending, msg, run } = useAction();
  const [plan, setPlan] = useState<SignupPlanId>("supporting");
  const [interval, setInterval] = useState<PartnerInterval>("monthly");
  return (
    <div className="flex flex-col gap-4">
      <PlanPicker plan={plan} interval={interval} onPlan={setPlan} onInterval={setInterval} withCommunity={false} />
      <button type="button" disabled={pending} onClick={() => run(() => startUpgradeAction(plan, plan === "anchor" ? "annual" : interval))} className={buttonClass("primary", "w-full sm:w-auto")}>
        {pending ? "Opening checkout…" : "Upgrade"}
      </button>
      <FormMessage message={msg} />
    </div>
  );
}

export function ManageBillingButton() {
  const { pending, msg, run } = useAction();
  return (
    <div className="flex flex-col gap-2">
      <button type="button" disabled={pending} onClick={() => run(() => openBillingPortalAction())} className={buttonClass("secondary", "w-full sm:w-auto")}>
        {pending ? "Opening…" : "Manage billing"}
      </button>
      <FormMessage message={msg} />
    </div>
  );
}

/** Anchor Partner, owner: ask for a category and a duration. Victress approves the category, then the owner pays a Stripe hosted invoice. */
export function ExclusivityRequestForm() {
  const { pending, msg, run } = useAction();
  const [category, setCategory] = useState("");
  const [years, setYears] = useState("1");
  const [note, setNote] = useState("");
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        run(() => requestExclusivityAction({ category, duration_months: (Number(years) * 12) as 12, note }));
      }}
    >
      <Labeled id="x-category" label="Category">
        <input id="x-category" value={category} onChange={(e) => setCategory(e.target.value)} maxLength={80} placeholder="For example, gaming peripherals" className={inputClass} />
      </Labeled>
      <Labeled id="x-years" label="Duration">
        <select id="x-years" value={years} onChange={(e) => setYears(e.target.value)} className={inputClass}>
          {[1, 2, 3, 4, 5].map((y) => (
            <option key={y} value={y}>
              {y === 1 ? "1 year" : `${y} years`}
            </option>
          ))}
        </select>
      </Labeled>
      <Labeled id="x-note" label="Anything Victress should know (optional)">
        <textarea id="x-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} rows={3} className={inputClass} />
      </Labeled>
      <button type="submit" disabled={pending || category.trim().length < 3} className={buttonClass("primary", "w-full sm:w-auto")}>
        {pending ? "Sending…" : "Request Category Exclusivity"}
      </button>
      <FormMessage message={msg} />
    </form>
  );
}

export function ExclusivityActions({ id, status, hasInvoice, billingOpen }: { id: string; status: string; hasInvoice: boolean; billingOpen: boolean }) {
  const { pending, msg, run } = useAction();
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-3">
        {status === "approved" ? (
          <button type="button" disabled={pending || !billingOpen} onClick={() => run(() => startExclusivityInvoiceAction(id))} className={buttonClass("primary", "w-full sm:w-auto")}>
            {pending ? "Opening…" : hasInvoice ? "Open invoice" : "Pay by invoice"}
          </button>
        ) : null}
        {status === "requested" || status === "approved" ? (
          <button type="button" disabled={pending} onClick={() => run(() => withdrawExclusivityAction(id))} className={buttonClass("secondary", "w-full sm:w-auto")}>
            Withdraw request
          </button>
        ) : null}
      </div>
      {status === "approved" && !billingOpen ? <p className="text-sm text-mute">Invoices are not open yet. Your approval is kept.</p> : null}
      <FormMessage message={msg} />
    </div>
  );
}
