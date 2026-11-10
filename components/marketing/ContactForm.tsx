"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { buttonClass } from "@/components/ui/Button";
import { Field, FormMessage, inputClass } from "@/components/ui/form";
import { copy } from "@/content/copy";
import { GAME_LIST } from "@/content/games";

type Kind = "organization" | "player" | "partnership";
type Status = "idle" | "sending" | "done" | "error" | "invalid";

/**
 * One form for both paths. It posts to /api/contact, which emails hello@victressesports.com. Nothing is stored, and
 * success is shown only when the email was actually sent.
 */
export function ContactForm({
  kind,
  id,
  submitLabel,
}: {
  kind: Kind;
  id: string;
  submitLabel: string;
}) {
  const f = copy.forms;
  const [status, setStatus] = useState<Status>("idle");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, ...data }),
      });
      if (res.ok) {
        setStatus("done");
        form.reset();
      } else setStatus(res.status === 400 ? "invalid" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <p
        role="status"
        className="rounded-2xl border border-line bg-surface-2 p-5 text-lg"
      >
        {f.done}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate={false}>
      <Field id={`${id}-name`} label={f.name}>
        <input
          id={`${id}-name`}
          name="name"
          required
          maxLength={100}
          autoComplete="name"
          className={inputClass}
        />
      </Field>
      <Field id={`${id}-email`} label={f.email}>
        <input
          id={`${id}-email`}
          name="email"
          type="email"
          required
          maxLength={254}
          autoComplete="email"
          className={inputClass}
        />
      </Field>
      {kind === "organization" || kind === "partnership" ? (
        <>
          <Field id={`${id}-org`} label={f.organization}>
            <input
              id={`${id}-org`}
              name="organization"
              required
              maxLength={120}
              autoComplete="organization"
              className={inputClass}
            />
          </Field>
          {kind === "organization" ? (
          <>
          <Field id={`${id}-role`} label={f.role}>
            <select
              id={`${id}-role`}
              name="role"
              required
              defaultValue=""
              className={inputClass}
            >
              <option value="" disabled>
                Select
              </option>
              {f.roles.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </Field>
          <Field id={`${id}-type`} label={f.teamType}>
            <select
              id={`${id}-type`}
              name="teamType"
              required
              defaultValue=""
              className={inputClass}
            >
              <option value="" disabled>
                Select
              </option>
              {f.teamTypes.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          </>
          ) : null}
        </>
      ) : null}
      {kind !== "partnership" ? (
      <Field id={`${id}-game`} label={f.game}>
        <select
          id={`${id}-game`}
          name="game"
          defaultValue=""
          className={inputClass}
        >
          <option value="">Select</option>
          {GAME_LIST.map((g) => (
            <option key={g.id}>{g.name}</option>
          ))}
          <option>{f.games}</option>
        </select>
      </Field>
      ) : null}
      <Field id={`${id}-message`} label={kind === "partnership" ? f.partnershipMessage : f.message}>
        <textarea
          id={`${id}-message`}
          name="message"
          rows={4}
          maxLength={1500}
          className={`${inputClass} py-3`}
        />
      </Field>
      {/* Honeypot: hidden from people and from assistive technology. */}
      <div
        aria-hidden
        className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
      >
        <label htmlFor={`${id}-website`}>Website</label>
        <input
          id={`${id}-website`}
          name="website"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>
      <button
        type="submit"
        disabled={status === "sending"}
        className={buttonClass("primary", "w-full sm:w-auto")}
      >
        {status === "sending" ? f.sending : submitLabel}
      </button>
      <p className="text-sm text-mute">
        {f.notice}{" "}
        <Link
          href="/privacy"
          className="inline-block py-1 font-semibold text-white underline underline-offset-2"
        >
          {f.privacy}
        </Link>
        .
      </p>
      <FormMessage
        message={
          status === "error" ? f.error : status === "invalid" ? f.invalid : ""
        }
      />
    </form>
  );
}
