"use client";

import { useState, useTransition } from "react";
import { submitConsentAction, signOutFromConsentAction } from "@/app/a/consent/actions";
import { buttonClass } from "@/components/ui/Button";
import { Field, FormMessage, inputClass } from "@/components/ui/form";

export function ConsentForm({ askAge, termsUrl, privacyUrl }: { askAge: boolean; termsUrl: string; privacyUrl: string }) {
  const [pending, start] = useTransition();
  const [birth, setBirth] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [msg, setMsg] = useState("");
  const [blocked, setBlocked] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    start(async () => {
      const r = await submitConsentAction({ birthDate: askAge ? birth : undefined, accepted: accepted as true });
      if (r && !r.ok) {
        setMsg(r.message);
        if (r.underage) setBlocked(true);
      }
    });
  }

  if (blocked) {
    return (
      <div role="alert" className="rounded-2xl border border-line bg-surface p-6">
        <p className="font-display text-2xl font-bold">You must be 13 or older.</p>
        <p className="mt-2 text-mute">Victress is for players 13 and older, so we have not created an account and have not kept the details you gave.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      {askAge ? (
        <Field id="consent-birth" label="Date of birth">
          <input
            id="consent-birth"
            type="date"
            required
            min="1900-01-01"
            max={today}
            value={birth}
            onChange={(e) => setBirth(e.target.value)}
            autoComplete="bday"
            className={inputClass}
          />
          <span className="text-sm text-mute">Used only to check that you meet the minimum age. It is private and never shown on your profile.</span>
        </Field>
      ) : null}
      <label className="flex items-start gap-3 text-base">
        <input
          id="consent-accept"
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-1 h-5 w-5 shrink-0 accent-[#cf142b]"
        />
        <span>
          I accept the{" "}
          <a href={termsUrl} target="_blank" rel="noreferrer" className="font-semibold text-white underline underline-offset-2">
            Terms
          </a>{" "}
          and the{" "}
          <a href={privacyUrl} target="_blank" rel="noreferrer" className="font-semibold text-white underline underline-offset-2">
            Privacy Policy
          </a>
          .
        </span>
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending || !accepted || (askAge && !birth)} className={buttonClass("primary", "w-full sm:w-auto")}>
          {pending ? "Saving…" : "Continue"}
        </button>
        <button type="button" disabled={pending} onClick={() => start(() => signOutFromConsentAction())} className={buttonClass("ghost", "px-3 text-mute")}>
          Sign out
        </button>
      </div>
      <FormMessage message={msg} />
    </form>
  );
}
