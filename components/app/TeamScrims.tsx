"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteTeamScrimAction, setTeamSharingAction } from "@/app/a/dashboard/team/scrims/actions";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/form";

export function TeamSharingToggle({ on }: { on: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <div>
        <Button
          type="button"
          variant={on ? "secondary" : "primary"}
          disabled={pending}
          onClick={() => start(async () => { const r = await setTeamSharingAction(!on); setOk(r.ok); setMsg(r.message ?? ""); if (r.ok) router.refresh(); })}
        >
          {pending ? "Saving" : on ? "Stop sharing my numbers" : "Share my numbers with my team"}
        </Button>
      </div>
      <FormMessage message={msg} ok={ok} />
    </div>
  );
}

export function DeleteTeamScrim({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={pending}
        className="min-h-11 self-start text-sm text-mute underline underline-offset-4 hover:text-white disabled:opacity-60"
        onClick={() => {
          if (!confirm("Remove this scrim from your team's list? Your teammates will no longer see it.")) return;
          start(async () => { const r = await deleteTeamScrimAction(id); setMsg(r.ok ? "" : r.message ?? ""); if (r.ok) router.refresh(); });
        }}
      >
        {pending ? "Removing" : "Remove from team"}
      </button>
      {msg ? <FormMessage message={msg} /> : null}
    </div>
  );
}
