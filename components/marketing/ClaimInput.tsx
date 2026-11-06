"use client";

import { useEffect, useId, useState } from "react";
import { copy } from "@/content/copy";
import { appFormAction, appFormHidden } from "@/lib/urls";

type State = "idle" | "checking" | "available" | "taken" | "invalid" | "reserved" | "error";

export function ClaimInput({ id: idProp }: { id?: string }) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const [value, setValue] = useState("");
  const [remote, setRemote] = useState<{ handle: string; status: State } | null>(null);
  const c = copy.claim;

  const handle = value.trim().toLowerCase();
  const local: State | null = !handle ? "idle" : /^[a-z0-9_]{3,20}$/.test(handle) ? null : "invalid";
  // Derived during render: no setState in the effect body, only in the async callback.
  const state: State = local ?? (remote?.handle === handle ? remote.status : "checking");

  useEffect(() => {
    if (!handle || !/^[a-z0-9_]{3,20}$/.test(handle)) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/handle-check?handle=${encodeURIComponent(handle)}`, { signal: ctrl.signal });
        const json = (await res.json()) as { status: State };
        setRemote({ handle, status: res.ok ? json.status : "error" });
      } catch (e) {
        if ((e as Error).name !== "AbortError") setRemote({ handle, status: "error" });
      }
    }, 350);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [handle]);

  const canClaim = state === "available";
  const message: Record<State, string> = {
    idle: "",
    checking: c.checking,
    available: `${handle} ${c.available}`,
    taken: `${handle} ${c.taken}`,
    invalid: c.invalid,
    reserved: c.reserved,
    error: c.error,
  };

  return (
    <form
      action={appFormAction("/login")}
      method="get"
      className="w-full max-w-xl"
      onSubmit={(e) => {
        if (!canClaim) e.preventDefault();
      }}
    >
      {Object.entries(appFormHidden("/login") ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <label htmlFor={id} className="sr-only">
        {c.label}
      </label>
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-2 focus-within:border-white sm:flex-row sm:items-center">
        <div className="flex min-h-12 min-w-0 flex-1 items-center pl-4 text-lg">
          <span className="select-none text-mute" aria-hidden>
            {c.prefix}
          </span>
          <input
            id={id}
            name="claim"
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/\s/g, ""))}
            placeholder={c.placeholder}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={20}
            aria-describedby={`${id}-status`}
            aria-invalid={state === "invalid" || state === "taken" || state === "reserved"}
            className="w-full min-w-0 flex-1 bg-transparent py-3 font-semibold text-white placeholder:text-cool-gray focus-visible:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={!canClaim}
          className="min-h-12 rounded-xl bg-crimson px-8 text-base font-semibold text-white transition-colors hover:bg-signal hover:text-carbon disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-mute"
        >
          {c.button}
        </button>
      </div>
      <p
        id={`${id}-status`}
        role="status"
        aria-live="polite"
        className={`mt-3 min-h-6 pl-2 text-sm ${state === "available" ? "text-coral" : "text-mute"}`}
      >
        {message[state]}
      </p>
    </form>
  );
}
