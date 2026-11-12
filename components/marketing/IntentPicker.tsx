"use client";

import { useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { copy } from "@/content/copy";

type Intent = (typeof copy.home.intent.options)[number]["id"];

const soonTag = "inline-flex rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-coral";
const row = "flex items-center justify-between gap-4 border-b border-line py-4 last:border-b-0";

/**
 * The job to be done: the visitor picks a role and the panel below shows that role's next step.
 * Each panel has one primary button. Unbuilt items carry one plain "Coming soon" label and nothing else about status.
 * Hrefs are passed in from the server page so product site links are built in one place (lib/urls.ts).
 */
export function IntentPicker({ playerHref, teamHref }: { playerHref: string; teamHref: string }) {
  const t = copy.home.intent;
  const [intent, setIntent] = useState<Intent>("player");

  return (
    <section aria-labelledby="intent-title" className="border-t border-line bg-surface/40">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <h2 id="intent-title" className="text-center font-display text-3xl font-bold leading-tight sm:text-5xl">
          {t.title}
        </h2>

        <div role="group" aria-label={t.title} className="mt-10 grid gap-4 md:grid-cols-3">
          {t.options.map((o) => {
            const selected = intent === o.id;
            return (
              <button
                key={o.id}
                type="button"
                aria-pressed={selected}
                aria-controls="intent-panel"
                onClick={() => setIntent(o.id)}
                className={`flex min-h-52 flex-col gap-3 rounded-2xl border-2 p-6 text-left transition-colors sm:p-8 ${
                  selected ? "border-crimson bg-surface-2" : "border-line bg-surface hover:border-cool-gray"
                }`}
              >
                <span className="font-display text-2xl font-bold">{o.title}</span>
                <span className="text-mute">{o.line}</span>
                <span className="mt-auto text-sm font-semibold">
                  {o.link} <span aria-hidden>→</span>
                </span>
              </button>
            );
          })}
        </div>

        <div id="intent-panel" aria-live="polite" className="mt-4 rounded-2xl border border-line bg-surface p-6 sm:p-10">
          {intent === "player" ? (
            <Panel title={t.player.title} line={t.player.line} actions={<ButtonLink href={playerHref}>{t.player.cta}</ButtonLink>}>
              <ol>
                {t.player.steps.map((s, i) => (
                  <li key={s} className={`${row} justify-start`}>
                    <span className="tnum w-6 text-sm font-semibold text-coral">{i + 1}</span>
                    <span className="text-lg">{s}</span>
                  </li>
                ))}
              </ol>
            </Panel>
          ) : null}

          {intent === "team" ? (
            <Panel
              title={t.team.title}
              line={t.team.line}
              actions={
                <>
                  <ButtonLink href={teamHref}>{t.team.cta}</ButtonLink>
                  <ButtonLink href="/design-partner" variant="secondary">
                    {t.team.secondary}
                  </ButtonLink>
                </>
              }
            >
              <ul>
                {t.team.items.map((it) => (
                  <li key={it.label} className={row}>
                    <span className="text-lg">{it.label}</span>
                    {it.soon ? <span className={soonTag}>{copy.home.soonLabel}</span> : null}
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}

          {intent === "recruiter" ? (
            <Panel
              title={t.recruiter.title}
              tag={t.recruiter.soon ? <span className={soonTag}>{copy.home.soonLabel}</span> : null}
              line={t.recruiter.line}
              actions={<ButtonLink href="/contact">{t.recruiter.cta}</ButtonLink>}
            >
              <ul>
                {t.recruiter.items.map((s) => (
                  <li key={s} className={row}>
                    <span className="text-lg">{s}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function Panel({
  title,
  tag,
  line,
  actions,
  children,
}: {
  title: string;
  tag?: React.ReactNode;
  line: string;
  actions: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="grid items-center gap-10 md:grid-cols-2">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="font-display text-3xl font-bold leading-tight">{title}</h3>
          {tag}
        </div>
        <p className="mt-3 max-w-md text-lg text-mute">{line}</p>
        <div className="mt-7 flex flex-wrap gap-3">{actions}</div>
      </div>
      {children}
    </div>
  );
}
