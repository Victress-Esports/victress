"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { buttonClass } from "@/components/ui/Button";
import { claimNameAction, finishOnboardingAction } from "@/app/a/onboarding/actions";
import type { GameConfig } from "@/content/games";
import { ROLES, getRole, type RoleId } from "@/lib/roles";

type Step = "type" | "name" | "game" | "role";
type AccountType = RoleId;

const TYPES = ROLES.map((r) => ({ id: r.id, title: r.title, line: r.line }));

const card =
  "min-h-16 rounded-2xl border border-line bg-surface px-5 py-4 text-left text-lg font-semibold transition-colors hover:border-white focus-visible:border-white aria-pressed:border-crimson aria-pressed:bg-crimson";

const NAME_MESSAGES: Record<string, string> = {
  taken: "That name is taken. Try another.",
  reserved: "That name isn't available.",
  invalid: "Use 3 to 20 letters, numbers or underscores.",
  cooldown: "You can change your name once every 30 days.",
  error: "Something went wrong. Try again.",
};

export function OnboardingWizard({ games, needsName, initialRole = null }: { games: GameConfig[]; needsName: boolean; initialRole?: RoleId | null }) {
  const [pending, start] = useTransition();
  // A role chosen on the website (in the sign in link) skips the "how will you use Victress" question.
  const needsGameFor = (t: AccountType) => getRole(t)?.game !== false;
  const firstStep = (t: AccountType): Step => (needsName ? "name" : "game");
  const [step, setStep] = useState<Step>(initialRole ? firstStep(initialRole) : "type");
  const [accountType, setAccountType] = useState<AccountType>(initialRole ?? "player");
  const [game, setGame] = useState<GameConfig | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [nameMsg, setNameMsg] = useState("");

  // Games without fixed roles (Rocket League) skip the role step.
  const hasRoles = (g: GameConfig | null) => !g || g.roles.length > 0;
  const progressSteps: Step[] = ["game", ...(hasRoles(game) ? (["role"] as const) : [])];
  const pct = step === "name" || step === "type" ? 0 : Math.round(((progressSteps.indexOf(step) + 1) / progressSteps.length) * 100);

  const finish = (g: GameConfig | null, r: string | null) =>
    start(async () => {
      await finishOnboardingAction({ game: g?.id ?? null, role: r, account_type: accountType });
    });

  function pickGame(g: GameConfig) {
    setGame(g);
    setRole(null);
    if (g.roles.length) setStep("role");
    else finish(g, null); // no fixed roles (Rocket League): nothing left to ask
  }
  function pickRole(r: string) {
    setRole(r);
    finish(game, r);
  }
  function skip() {
    if (step === "game") return finish(null, null); // no game: nothing left to ask
    if (step === "role") return finish(game, null);
  }
  function pickType(t: AccountType) {
    setAccountType(t);
    setStep(firstStep(t));
  }
  // Roles without a game question (scout, college, partner) finish as soon as the name is settled.
  const auto = useRef(false);
  useEffect(() => {
    if (initialRole && !needsGameFor(initialRole) && !needsName && !auto.current) {
      auto.current = true;
      finish(null, null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function back() {
    if (step === "role") setStep("game");
  }

  function submitName(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const { status } = await claimNameAction(name);
      if (status === "ok") {
        setNameMsg("");
        if (needsGameFor(accountType)) setStep("game");
        else await finishOnboardingAction({ game: null, role: null, account_type: accountType });
      } else setNameMsg(NAME_MESSAGES[status] ?? NAME_MESSAGES.error);
    });
  }

  const title =
    step === "type"
      ? "How will you use Victress?"
      : step === "name"
      ? "Pick your name."
      : step === "game"
        ? "Pick your game."
        : `Pick your ${(game?.roleLabel ?? "role").toLowerCase()}.`;
  const line =
    step === "type"
      ? "This sets up your account. It does not give access to anyone else's data."
      : step === "name"
      ? "Choose the name on your account. Use 3 to 20 letters, numbers or underscores."
      : step === "game"
        ? "Where do you compete? You can add more later."
        : "How do you play?";

  return (
    <div className="flex flex-col gap-8">
      {step !== "name" && step !== "type" ? (
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

      {step === "type" ? (
        <div className="flex flex-col gap-3" role="group" aria-label="Account type">
          {TYPES.map((t) => (
            <button key={t.id} type="button" aria-pressed={accountType === t.id} onClick={() => pickType(t.id)} className={card}>
              {t.title}
              <span className="mt-1 block text-sm font-normal text-mute">{t.line}</span>
            </button>
          ))}
        </div>
      ) : null}

      {step === "name" ? (
        <form onSubmit={submitName} className="flex flex-col gap-3">
          <label htmlFor="ob-name" className="sr-only">
            Choose your Victress name
          </label>
          <div className="flex min-h-14 items-center rounded-2xl border border-line bg-surface pl-4 text-lg focus-within:border-white">
            <span className="select-none text-mute" aria-hidden>
              @
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

      {step !== "name" && step !== "type" ? (
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
