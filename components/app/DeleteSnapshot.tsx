"use client";

import { useState, useTransition } from "react";
import { deleteSnapshotAction } from "@/app/a/claim/actions";

export function DeleteSnapshot({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  return (
    <span className="inline-flex items-center gap-3 text-sm">
      <button type="button" disabled={pending} onClick={() => start(async () => setMsg((await deleteSnapshotAction(id)).message ?? ""))} className="min-h-11 text-mute underline hover:text-white">
        {pending ? "Deleting…" : "Delete this snapshot"}
      </button>
      {msg ? <span role="status">{msg}</span> : null}
    </span>
  );
}
