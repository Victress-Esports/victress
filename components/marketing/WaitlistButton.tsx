"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { buttonClass } from "@/components/ui/Button";
import { track } from "@/lib/analytics/client";
import { copy } from "@/content/copy";
import type { WaitlistInterest } from "@/content/pricing";

type Status = "idle" | "sending" | "done" | "error";

export function WaitlistButton({
  interest,
  label = copy.waitlist.submit,
  variant = "secondary",
  className = "",
}: {
  interest: WaitlistInterest;
  label?: string;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [email, setEmail] = useState("");
  const w = copy.waitlist;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const reset = () => setStatus((s) => (s === "done" ? "idle" : s));
    d.addEventListener("close", reset);
    return () => d.removeEventListener("close", reset);
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, interest }),
      });
      setStatus(res.ok ? "done" : "error");
      if (res.ok) {
        setEmail("");
        // The interest (plan or scrims) only; never the email address.
        track("generate_lead", { lead_type: "waitlist", interest });
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <>
      <button type="button" className={buttonClass(variant, className)} onClick={() => ref.current?.showModal()}>
        {label}
      </button>
      <dialog
        ref={ref}
        aria-labelledby={`wl-${interest}`}
        className="m-auto w-[min(92vw,28rem)] rounded-2xl border border-line bg-surface p-6 text-white backdrop:bg-black/70"
        onClick={(e) => e.target === ref.current && ref.current?.close()}
      >
        <h2 id={`wl-${interest}`} className="font-display text-2xl font-bold">
          {w.title}
        </h2>
        <p className="mt-2 text-mute">{w.line}</p>
        {status === "done" ? (
          <p role="status" className="mt-6 text-coral">
            {w.done}
          </p>
        ) : (
          <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
            <label htmlFor={`wl-email-${interest}`} className="sr-only">
              {w.emailLabel}
            </label>
            <input
              id={`wl-email-${interest}`}
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={w.emailPlaceholder}
              className="min-h-12 rounded-xl border border-line bg-carbon px-4 text-white placeholder:text-cool-gray focus:border-white focus:outline-none"
            />
            <button type="submit" disabled={status === "sending"} className={buttonClass("primary")}>
              {status === "sending" ? w.sending : w.submit}
            </button>
            {status === "error" ? (
              <p role="alert" className="text-sm text-coral">
                {w.error}
              </p>
            ) : null}
          </form>
        )}
        <button type="button" onClick={() => ref.current?.close()} className={buttonClass("ghost", "mt-2 w-full")}>
          {w.close}
        </button>
      </dialog>
    </>
  );
}
