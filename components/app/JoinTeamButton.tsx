"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buttonClass } from "@/components/ui/Button";
import { track } from "@/lib/analytics/client";
import { FormMessage } from "@/components/ui/form";
import { joinTeamAction } from "@/app/a/dashboard/actions";

export function JoinTeamButton({ code, teamName }: { code: string; teamName: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await joinTeamAction(code);
            if (r.ok) {
              track("team_joined");
              router.push("/dashboard/team");
            }
            else setMsg(r.message ?? "");
          })
        }
        className={buttonClass("primary", "w-full")}
      >
        {pending ? "Joining…" : `Join ${teamName}`}
      </button>
      <FormMessage message={msg} />
    </div>
  );
}
