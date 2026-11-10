"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buttonClass } from "@/components/ui/Button";
import type { AdminResult } from "@/app/a/dashboard/admin/actions";

/** One or two action buttons for an admin row. The server action re-checks admin status; hiding this component is not the control. */
export function AdminButtons({ actions }: { actions: { label: string; tone?: "primary" | "secondary"; run: () => Promise<AdminResult> }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <button
            key={a.label}
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await a.run();
                setMsg(r.message ?? "");
                if (r.ok) router.refresh();
              })
            }
            className={buttonClass(a.tone ?? "secondary")}
          >
            {a.label}
          </button>
        ))}
      </div>
      {msg ? (
        <p role="status" className="text-sm text-mute">
          {msg}
        </p>
      ) : null}
    </div>
  );
}
