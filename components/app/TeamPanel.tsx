"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { buttonClass } from "@/components/ui/Button";
import { CopyLink } from "@/components/app/CopyLink";
import { FormMessage, inputClass } from "@/components/ui/form";
import { createTeamAction, leaveTeamAction, regenerateInviteAction, removeMemberAction } from "@/app/a/dashboard/actions";

export function CreateTeamForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    start(async () => {
      const r = await createTeamAction(name);
      setMsg(r.message ?? "");
      if (r.ok) router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <label htmlFor="team-name" className="text-sm font-semibold">
        Team or club name
      </label>
      <input id="team-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Northwestern Esports" className={inputClass} />
      <button type="submit" disabled={pending || name.trim().length < 2} className={buttonClass("primary", "w-full sm:w-auto")}>
        {pending ? "Creating…" : "Start your team"}
      </button>
      <p className="text-sm text-mute">Free for now. You get an invite link to share with your roster.</p>
      <FormMessage message={msg} />
    </form>
  );
}

export function InviteBox({ url }: { url: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");

  return (
    <div className="flex flex-col gap-3">
      <p className="tnum break-all rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm text-mute">{url}</p>
      <div className="flex flex-wrap gap-2">
        <CopyLink url={url} label="Copy invite link" />
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await regenerateInviteAction();
              setMsg(r.message ?? "");
              if (r.ok) router.refresh();
            })
          }
          className={buttonClass("secondary")}
        >
          New link
        </button>
      </div>
      <p className="text-sm text-mute">Teammates open the link and tap Join. Rosters hold up to 10 (8 players and 2 coaches).</p>
      <FormMessage message={msg} />
    </div>
  );
}

export function LeaveTeamButton({ isOwner, alone }: { isOwner: boolean; alone: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const label = isOwner && alone ? "Disband team" : "Leave team";

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(isOwner && alone ? "Disband this team?" : "Leave this team?")) return;
          start(async () => {
            const r = await leaveTeamAction();
            setMsg(r.message ?? "");
            if (r.ok) router.refresh();
          });
        }}
        className={buttonClass("secondary", "w-full sm:w-auto")}
      >
        {label}
      </button>
      <FormMessage message={msg} />
    </div>
  );
}

export function RemoveMemberButton({ profileId, name }: { profileId: string; name: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-label={`Remove ${name} from the team`}
      onClick={() => {
        if (!window.confirm(`Remove ${name} from the team?`)) return;
        start(async () => {
          const r = await removeMemberAction(profileId);
          if (r.ok) router.refresh();
        });
      }}
      className={buttonClass("ghost", "min-h-11 px-3 text-sm text-mute")}
    >
      Remove
    </button>
  );
}
