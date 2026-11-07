"use client";

import { useState } from "react";
import { buttonClass } from "@/components/ui/Button";
import { track } from "@/lib/analytics/client";

export function CopyLink({
  url,
  label = "Copy your link",
  className = "",
  resumeShare = false,
}: {
  url: string;
  label?: string;
  className?: string;
  /** True only where the link is a Player Resume link (not a team invite link). */
  resumeShare?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (resumeShare) track("player_resume_shared", { method: "copy_link" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy your link", url);
    }
  }

  return (
    <button type="button" onClick={copy} className={buttonClass("primary", className)}>
      <span aria-live="polite">{copied ? "Copied" : label}</span>
    </button>
  );
}
