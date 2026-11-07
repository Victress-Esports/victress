"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createShareLinkAction, revokeShareLinkAction, savePrivacyAction } from "@/app/a/dashboard/privacy-actions";
import { buttonClass } from "@/components/ui/Button";
import { Section, FormMessage, inputClass } from "@/components/ui/form";

type Fields = Record<"display_name" | "avatar" | "bio" | "team" | "stats" | "rank_role", boolean>;
type Settings = { directory_listed: boolean; search_indexable: boolean; show_on_leaderboards: boolean; public_fields: Fields };
type Link = {
  id: string;
  label: string | null;
  fields: Fields;
  createdAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  lastViewedAt: string | null;
  views: number;
};

const FIELD_LABELS: { key: keyof Fields; label: string }[] = [
  { key: "display_name", label: "Display name" },
  { key: "avatar", label: "Photo" },
  { key: "bio", label: "Bio" },
  { key: "team", label: "Team" },
  { key: "rank_role", label: "Role and rank" },
  { key: "stats", label: "Stats (Self-reported)" },
];

const fmt = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

function Switch({ id, on, onChange, label, help, disabled }: { id: string; on: boolean; onChange: (v: boolean) => void; label: string; help: string; disabled?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div>
        <p id={`${id}-l`} className="font-semibold">
          {label}
        </p>
        <p id={`${id}-h`} className="mt-1 text-sm text-mute">
          {help}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-labelledby={`${id}-l`}
        aria-describedby={`${id}-h`}
        disabled={disabled}
        onClick={() => onChange(!on)}
        className={`relative mt-1 inline-flex h-8 w-14 shrink-0 items-center rounded-full border transition-colors disabled:opacity-50 ${
          on ? "border-crimson bg-crimson" : "border-line bg-surface-2"
        }`}
      >
        <span aria-hidden className={`inline-block h-6 w-6 rounded-full bg-white transition-transform ${on ? "translate-x-7" : "translate-x-1"}`} />
        <span className="sr-only">{on ? "On" : "Off"}</span>
      </button>
    </div>
  );
}

function FieldPicker({ prefix, fields, onChange }: { prefix: string; fields: Fields; onChange: (f: Fields) => void }) {
  return (
    <fieldset className="grid gap-2 sm:grid-cols-2">
      <legend className="sr-only">What can be seen</legend>
      {FIELD_LABELS.map((f) => (
        <label key={f.key} className="flex min-h-11 items-center gap-3 rounded-xl border border-line bg-surface-2 px-4">
          <input
            id={`${prefix}-${f.key}`}
            type="checkbox"
            checked={fields[f.key]}
            onChange={(e) => onChange({ ...fields, [f.key]: e.target.checked })}
            className="h-5 w-5 accent-[#CF142B]"
          />
          <span className="text-sm font-semibold">{f.label}</span>
        </label>
      ))}
    </fieldset>
  );
}

export function PrivacyControls({
  initial,
  directoryAvailable,
  sharingAvailable,
  links,
}: {
  initial: Settings;
  directoryAvailable: boolean;
  sharingAvailable: boolean;
  links: Link[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [s, setS] = useState(initial);
  const [msg, setMsg] = useState("");

  const [label, setLabel] = useState("");
  const [days, setDays] = useState(90);
  const [lf, setLf] = useState<Fields>({ display_name: false, avatar: false, bio: false, team: false, stats: false, rank_role: false });
  const [made, setMade] = useState<string | null>(null);
  const [linkMsg, setLinkMsg] = useState("");
  const [copied, setCopied] = useState(false);

  function save() {
    start(async () => {
      const r = await savePrivacyAction(s);
      setMsg(r.message ?? "");
      if (r.ok) router.refresh();
    });
  }
  function make() {
    start(async () => {
      const r = await createShareLinkAction({ label, days, fields: lf });
      setLinkMsg(r.message ?? "");
      if (r.ok && r.url) {
        setMade(r.url);
        setLabel("");
        router.refresh();
      }
    });
  }
  function revoke(id: string) {
    start(async () => {
      const r = await revokeShareLinkAction(id);
      setLinkMsg(r.message ?? "");
      if (r.ok) router.refresh();
    });
  }
  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      window.prompt("Copy this link", url);
    }
  }

  const off = !directoryAvailable;
  return (
    <>
      <Section title="Public profile" line="Off by default. Your account email and private details are never shown here.">
        {off ? (
          <p className="mb-3 rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm text-mute">
            Public profiles and leaderboards are not available yet. Your profile stays private. You can prepare your choices now.
          </p>
        ) : null}
        <div className="divide-y divide-line">
          <Switch
            id="dir"
            on={s.directory_listed}
            disabled={off && !s.directory_listed}
            onChange={(v) => setS({ ...s, directory_listed: v, search_indexable: v ? s.search_indexable : false })}
            label="List my profile publicly"
            help="Anyone can open your profile by your name. Only the fields you choose below are shown."
          />
          <Switch
            id="seo"
            on={s.search_indexable}
            disabled={!s.directory_listed}
            onChange={(v) => setS({ ...s, search_indexable: v })}
            label="Allow search engines to list it"
            help="Needs a public profile. Pages already listed drop out the next time they re-crawl."
          />
          <Switch
            id="board"
            on={s.show_on_leaderboards}
            disabled={off && !s.show_on_leaderboards}
            onChange={(v) => setS({ ...s, show_on_leaderboards: v })}
            label="Show me on leaderboards"
            help="Shows your name and the stats you made public for the game's board."
          />
        </div>
        <h3 className="mt-5 font-semibold">What a public profile shows</h3>
        <p className="mb-3 mt-1 text-sm text-mute">Your player name is always part of a public profile. Everything else is off until you turn it on.</p>
        <FieldPicker prefix="pub" fields={s.public_fields} onChange={(f) => setS({ ...s, public_fields: f })} />
        <div className="mt-5 flex items-center gap-4">
          <button type="button" onClick={save} disabled={pending} className={buttonClass("primary")}>
            Save choices
          </button>
          <FormMessage message={msg} />
        </div>
        <p className="mt-4 text-sm text-mute">
          Recruiter and scout discovery is not available. No one can find or contact you through Victress, and your contact details are never shared.
        </p>
      </Section>

      <Section title="Private sharing links" line="Share a view of your profile with one person, without making it public. Revoke it any time.">
        {!sharingAvailable ? (
          <p className="rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm text-mute">Sharing links are not available yet.</p>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor="link-label" className="text-sm font-semibold">
                Name this link (only you see it)
              </label>
              <input id="link-label" value={label} maxLength={60} onChange={(e) => setLabel(e.target.value)} className={`${inputClass} mt-2`} placeholder="For example: Coach Rivera" />
            </div>
            <FieldPicker prefix="lnk" fields={lf} onChange={setLf} />
            <div>
              <label htmlFor="link-days" className="text-sm font-semibold">
                Expires after
              </label>
              <select id="link-days" value={days} onChange={(e) => setDays(Number(e.target.value))} className={`${inputClass} mt-2`}>
                <option value={7}>7 days</option>
                <option value={30}>30 days</option>
                <option value={90}>90 days</option>
              </select>
            </div>
            <div className="flex items-center gap-4">
              <button type="button" onClick={make} disabled={pending} className={buttonClass("primary")}>
                Create link
              </button>
              <FormMessage message={linkMsg} />
            </div>
            {made ? (
              <div className="rounded-xl border border-crimson bg-surface-2 p-4">
                <p className="text-sm font-semibold">Copy this link now. It is shown only once.</p>
                <p className="mt-2 break-all text-sm text-mute">{made}</p>
                <button type="button" onClick={() => copy(made)} className={buttonClass("secondary", "mt-3")}>
                  {copied ? "Copied" : "Copy link"}
                </button>
              </div>
            ) : null}
            <ul className="flex flex-col gap-2">
              {links.map((l) => {
                const expired = !!l.expiresAt && new Date(l.expiresAt) < new Date();
                const status = l.revokedAt ? "Revoked" : expired ? "Expired" : "Active";
                return (
                  <li key={l.id} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface-2 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{l.label || "Untitled link"}</p>
                      <p className="text-sm text-mute">
                        {status} · created {fmt(l.createdAt)}
                        {l.expiresAt ? ` · expires ${fmt(l.expiresAt)}` : ""} · {l.views} {l.views === 1 ? "view" : "views"}
                      </p>
                    </div>
                    {status === "Active" ? (
                      <button type="button" onClick={() => revoke(l.id)} disabled={pending} className={buttonClass("ghost", "min-h-11 px-3 text-sm")}>
                        Revoke
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </Section>
    </>
  );
}
