"use client";

import { useState, useTransition } from "react";
import { buttonClass } from "@/components/ui/Button";
import { cancelPendingEvent, trackOnNextPage } from "@/lib/analytics/client";
import { claimNameAction, finishOnboardingAction } from "@/app/a/onboarding/actions";
import type { GameConfig } from "@/content/games";

type Step = "name" | "game" | "role" | "rank";

const card =
  "min-h-16 rounded-2xl border border-line bg-surface px-5 py-4 text-left text-lg font-semibold transition-colors hover:border-white focus-visible:border-white aria-pressed:border-crimson aria-pressed:bg-crimson";

const NAME_MESSAGES: Record<string, string> = {
  taken: "That name is taken. Try another.",
  reserved: "That name isn't available.",
  invalid: "Use 3 to 20 letters, numbers or underscores.",
  cooldown: "You can change your name once every 30 days.",
  error: "Something went wrong. Try again.",
};

export function OnboardingWizard({ games, needsName }: { games: GameConfig[]; needsName: boolean }) {
  const [pending, start] = useTransition();
  const [step, setStep] = useState<Step>(needsName ? "name" : "game");
  const [game, setGame] = useState<GameConfig | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [nameMsg, setNameMsg] = useState("");

  // Games without fixed roles (Rocket League) skip the role step.
  const hasRoles = (g: GameConfig | null) => !g || g.roles.length > 0;
  const progressSteps: Step[] = ["game", ...(hasRoles(game) ? (["role"] as const) : []), "rank"];
  const pct = step === "name" ? 0 : Math.round(((progressSteps.indexOf(step) + 1) / progressSteps.length) * 100);

  const finish = (g: GameConfig | null, r: string | null, k: string | null) =>
    start(async () => {
      // The action redirects on success, so nothing after it runs then. The event is sent on the next page; if the action
      // comes back (it failed), it is cancelled and not counted.
      trackOnNextPage("player_resume_created", { game: g?.id ?? "none", role_selected: !!r, rank_selected: !!k });
      await finishOnboardingAction({ game: g?.id ?? null, role: r, rank: k });
      cancelPendingEvent();
    });

  function pickGame(g: GameConfig) {
    setGame(g);
    setRole(null);
    setStep(g.roles.length ? "role" : "rank");
  }
  function pickRole(r: string) {
    setRole(r);
    setStep("rank");
  }
  function skip() {
    if (step === "game") return finish(null, null, null); // no game: nothing left to ask
    if (step === "role") return setStep("rank");
    if (step === "rank") return finish(game, role, null);
  }
  function back() {
    if (step === "rank") setStep(game && game.roles.length ? "role" : "game");
    else if (step === "role") setStep("game");
  }

  function submitName(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const { status } = await claimNameAction(name);
      if (status === "ok") {
        setNameMsg("");
        setStep("game");
      } else setNameMsg(NAME_MESSAGES[status] ?? NAME_MESSAGES.error);
    });
  }

  const title =
    step === "name"
      ? "Pick your name."
      : step === "game"
        ? "Pick your game."
        : step === "role"
          ? `Pick your ${(game?.roleLabel ?? "role").toLowerCase()}.`
          : "Pick your rank.";
  const line =
    step === "name"
      ? "That one was taken. Choose another."
      : step === "game"
        ? "Where do you compete? You can add more later."
        : step === "role"
          ? "How do you play?"
          : game
            ? `Your current ${game.name} rank.`
            : "Where are you today?";

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
        <h1 className="font-display text-4xl font-bold">{title}</h1>
        <p className="mt-2 text-mute">{line}</p>
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
          {games.map((g) => (
            <button key={g.id} type="button" aria-pressed={game?.id === g.id} onClick={() => pickGame(g)} className={card}>
              {g.name}
            </button>
          ))}
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
            <button key={k} type="button" disabled={pending} onClick={() => finish(game, role, k)} className={card}>
              {k}
            </button>
          ))}
        </div>
      ) : null}

      {step !== "name" ? (
        <div className="flex items-center justify-between">
          <button type="button" onClick={back} disabled={step === "game" || pending} className={buttonClass("ghost", "px-2 disabled:invisible")}>
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
