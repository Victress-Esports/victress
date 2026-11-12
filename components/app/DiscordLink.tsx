"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmDiscordLinkAction, unlinkDiscordAction } from "@/app/a/dashboard/link/discord/actions";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/form";

export function DiscordLinkConfirm({ code }: { code: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);
  const [done, setDone] = useState(false);
  if (done) return <FormMessage message={msg} ok />;
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => { const r = await confirmDiscordLinkAction(code); setOk(r.ok); setMsg(r.message ?? ""); if (r.ok) { setDone(true); router.refresh(); } });
      }}
    >
      <label className="flex items-start gap-3 text-sm text-mute">
        <input type="checkbox" required className="mt-1 h-5 w-5" />
        <span>I just ran /link myself in Discord, and I want to link that Discord account to my Victress account.</span>
      </label>
      <div><Button type="submit" disabled={pending}>{pending ? "Linking" : "Link my Discord account"}</Button></div>
      <FormMessage message={msg} ok={ok} />
    </form>
  );
}

export function DiscordUnlink() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  return (
    <div className="flex flex-col gap-2">
      <Button variant="secondary" type="button" disabled={pending} onClick={() => { if (!confirm("Unlink your Discord account? Your Victress account and saved data stay as they are.")) return; start(async () => { const r = await unlinkDiscordAction(); setMsg(r.message ?? ""); if (r.ok) router.refresh(); }); }}>
        Unlink Discord
      </Button>
      <FormMessage message={msg} />
    </div>
  );
}
