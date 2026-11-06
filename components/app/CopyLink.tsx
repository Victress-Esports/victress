"use client";

import { useState } from "react";
import { buttonClass } from "@/components/ui/Button";

export function CopyLink({ url, label = "Copy your link", className = "" }: { url: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
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
