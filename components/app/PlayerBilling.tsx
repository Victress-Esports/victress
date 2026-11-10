"use client";

import { useState, useTransition } from "react";
import { buttonClass } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/form";
import { openPlayerPortalAction, startPlayerCheckoutAction } from "@/app/a/settings/billing/actions";

export function CheckoutButton({ plan, interval, label }: { plan: string; interval: string; label: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setMsg("");
            const r = await startPlayerCheckoutAction(plan, interval);
            if (r && !r.ok) setMsg(r.message);
          })
        }
        className={buttonClass("primary", "w-full sm:w-auto")}
      >
        {pending ? "Opening checkout…" : label}
      </button>
      <FormMessage message={msg} />
    </div>
  );
}

export function PortalButton() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setMsg("");
            const r = await openPlayerPortalAction();
            if (r && !r.ok) setMsg(r.message);
          })
        }
        className={buttonClass("secondary", "w-full sm:w-auto")}
      >
        {pending ? "Opening…" : "Manage billing"}
      </button>
      <FormMessage message={msg} />
    </div>
  );
}
