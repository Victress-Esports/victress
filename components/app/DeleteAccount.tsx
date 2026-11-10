"use client";

import { useState, useTransition } from "react";
import { deleteAccountAction } from "@/app/a/dashboard/account/actions";
import { buttonClass } from "@/components/ui/Button";
import { Field, FormMessage, inputClass } from "@/components/ui/form";

export function DeleteAccount({ handle }: { handle: string }) {
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const ready = confirm.trim().toLowerCase() === handle.toLowerCase();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    start(async () => {
      const r = await deleteAccountAction({ confirm });
      if (r && !r.ok) setMsg(r.message);
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field id="delete-confirm" label={`Type ${handle} to confirm`}>
        <input id="delete-confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false} className={inputClass} />
      </Field>
      <div>
        <button type="submit" disabled={pending || !ready} className={buttonClass("secondary", "border-signal text-signal")}>
          {pending ? "Deleting…" : "Delete my account"}
        </button>
      </div>
      <FormMessage message={msg} />
    </form>
  );
}
