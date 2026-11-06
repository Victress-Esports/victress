"use client";

import { useState, useTransition } from "react";
import { buttonClass } from "@/components/ui/Button";
import { claimNameAction, finishOnboardingAction } from "@/app/a/onboarding/actions";
import type { GameConfig } from "@/content/games";

type Step = "name" | "game" | "role" | "rank";

const COPY = {
  name: { title: "Pick your name.", line: "That one was taken. Choose another." },
  game: { title: "Pick your game.", line: "Where do you compete?" },
  role: { title: "Pick your role.", line: "How do you play?" },
  rank: { title: "Pick your rank.", line: "Where are you today?" },
};

const card =
  "min-h-16 rounded-2xl border border-line bg-surface px-5 py-4 text-left text-lg font-semibold transition-colors hover:border-white focus-visible:border-white aria-pressed:border-crimson aria-pressed:bg-crimson aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:border-line";

export function OnboardingWizard({
  games,
  launchGameId,
  needsName,
}: {
  games: GameConfig[];
  launchGameId: string;
  needsName: boolean;
}) {
  const [pending, start] = useTransition();
  // Frozen on mount so the step list does not change after the name is claimed.
  const [steps] = useState<Step[]>(() => [...(needsName ? (["name"] as const) : []), "game", "role", "rank"]);
  const [i, setI] = useState(0);
  const [game, setGame] = useState<GameConfig | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [rank, setRank] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [nameMsg, setNameMsg] = useState("");

  const step = steps[i];
  const countable = steps.filter((s) => s !== "name");
  const doneCount = Math.max(0, countable.indexOf(step as Exclude<Step, "name">));
  const pct = step === "name" ? 0 : Math.round(((doneCount + 1) / countable.length) * 100);

  const finish = (g: GameConfig | null, r: string | null, k: string | null) =>
    start(async () => {
      await finishOnboardingAction({ game: (g?.id as "VALORANT" | "CS2") ?? null, role: r, rank: k });
    });

  const next = () => setI((n) => Math.min(n + 1, steps.length - 1));

  function pickGame(g: GameConfig) {
    setGame(g);
    next();
  }
  function pickRole(r: string) {
    setRole(r);
    next();
  }
  function pickRank(k: string) {
    setRank(k);
    finish(game, role, k);
  }
  function skip() {
    if (step === "game") return finish(null, null, null); // no game: nothing left to ask
    if (step === "role") return next();
    if (step === "rank") return finish(game, role, null);
  }

  function submitName(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const { status } = await claimNameAction(name);
      if (status === "ok") {
        setNameMsg("");
        next();
      } else {
        setNameMsg(
          status === "taken"
            ? "That name is taken. Try another."
            : status === "reserved"
              ? "That name isn't available."
              : status === "invalid"
                ? "Use 3 to 20 letters, numbers or underscores."
                : "Something went wrong. Try again.",
        );
      }
    });
  }

  return (
    <div className="flex flex-col gap-8">
      {step !== "name" ? (
        <div
          role="progressbar"
          aria-label="Onboarding progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          className="h-2 overflow-hidden rounded-full bg-surface-2"
        >
          <div className="h-full rounded-full bg-crimson transition-[width] duration-300" style={{ width: `${pct}%` }} />
        </div>
      ) : null}

      <div>
        <h1 className="font-display text-4xl font-bold">{COPY[step].title}</h1>
        <p className="mt-2 text-mute">{COPY[step].line}</p>
      </div>

      {step === "name" ? (
        <form onSubmit={submitName} className="flex flex-col gap-3">
          <label htmlFor="ob-name" className="sr-only">
            Choose your Victress name
          </label>
          <div className="flex min-h-14 items-center rounded-2xl border border-line bg-surface pl-4 text-lg focus-within:border-white">
            <span className="select-none text-mute" aria-hidden>
              victress.gg/
            </span>
            <input
              id="ob-name"
              value={name}
              onChange={(e) => setName(e.target.value.replace(/\s/g, ""))}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={20}
              placeholder="yourname"
              aria-describedby="ob-name-msg"
              className="w-full min-w-0 flex-1 bg-transparent py-3 font-semibold text-white placeholder:text-cool-gray focus-visible:outline-none"
            />
          </div>
          <p id="ob-name-msg" role="status" aria-live="polite" className="min-h-6 text-sm text-coral">
            {nameMsg}
          </p>
          <button type="submit" disabled={pending || name.length < 3} className={buttonClass("primary", "w-full")}>
            {pending ? "Checking…" : "Claim it"}
          </button>
        </form>
      ) : null}

      {step === "game" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {games.map((g) => {
            const available = g.id === launchGameId;
            return (
              <button
                key={g.id}
                type="button"
                aria-disabled={!available}
                aria-pressed={game?.id === g.id}
                onClick={() => available && pickGame(g)}
                className={card}
              >
                {g.name}
                {!available ? <span className="mt-1 block text-sm font-normal text-mute">Coming soon</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}

      {step === "role" && game ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {game.roles.map((r) => (
            <button key={r} type="button" aria-pressed={role === r} onClick={() => pickRole(r)} className={card}>
              {r}
            </button>
          ))}
        </div>
      ) : null}

      {step === "rank" && game ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {game.ranks.map((k) => (
            <button key={k} type="button" aria-pressed={rank === k} disabled={pending} onClick={() => pickRank(k)} className={card}>
              {k}
            </button>
          ))}
        </div>
      ) : null}

      {step !== "name" ? (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setI((n) => Math.max(0, n - 1))}
            disabled={i === 0 || pending || steps[i - 1] === "name"}
            className={buttonClass("ghost", "px-2 disabled:invisible")}
          >
            Back
          </button>
          <button type="button" onClick={skip} disabled={pending} className={buttonClass("ghost", "px-2 text-mute")}>
            Skip
          </button>
        </div>
      ) : null}
    </div>
  );
}
