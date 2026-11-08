"use client";

import { useState, type FormEvent } from "react";
import { buttonClass } from "@/components/ui/Button";
import { supabaseBrowser } from "@/lib/supabase/client";

type Status = "idle" | "sending" | "sent" | "error";

// The claimed handle and destination travel in short-lived cookies (not the redirect URL), so the
// Supabase redirect allow-list only needs the plain /auth/callback URL.
function remember(claim: string, next: string) {
  const attrs = "; path=/; max-age=1800; SameSite=Lax" + (location.protocol === "https:" ? "; Secure" : "");
  if (claim) document.cookie = `v_claim=${encodeURIComponent(claim)}${attrs}`;
  if (next) document.cookie = `v_next=${encodeURIComponent(next)}${attrs}`;
}

/** Counts that someone started signing in. Sends only the method: no identity, no cookie, nothing else. */
function started(method: "email" | "discord" | "google") {
  try { void fetch("/api/events", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "registration_started", method }), keepalive: true }); } catch { /* ignore */ }
}

export function LoginForm({ claim, next }: { claim: string; next: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [oauthError, setOauthError] = useState(false);

  const redirectTo = () => `${location.origin}/auth/callback`;

  async function oauth(provider: "discord" | "google") {
    setOauthError(false);
    remember(claim, next);
    started(provider);
    const { error } = await supabaseBrowser().auth.signInWithOAuth({
      provider,
      options: { redirectTo: redirectTo() },
    });
    if (error) setOauthError(true);
  }

  async function magic(e: FormEvent) {
    e.preventDefault();
    setStatus("sending");
    remember(claim, next);
    started("email");
    const { error } = await supabaseBrowser().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo(), data: claim ? { claim } : undefined },
    });
    setStatus(error ? "error" : "sent");
  }

  if (status === "sent") {
    return (
      <div role="status" className="rounded-2xl border border-line bg-surface p-6">
        <p className="font-display text-2xl font-bold">Check your inbox.</p>
        <p className="mt-2 text-mute">We sent a link to {email}. Open it to sign in. If you are new, it creates your free account.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <button type="button" onClick={() => oauth("discord")} className={buttonClass("primary", "w-full")}>
        Continue with Discord
      </button>
      <button type="button" onClick={() => oauth("google")} className={buttonClass("secondary", "w-full")}>
        Continue with Google
      </button>
      {oauthError ? (
        <p role="alert" className="text-sm text-coral">
          Couldn&apos;t start sign in. Try again.
        </p>
      ) : null}

      <div className="my-2 flex items-center gap-3 text-sm text-mute" aria-hidden>
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={magic} className="flex flex-col gap-3">
        <label htmlFor="login-email" className="sr-only">
          Email address
        </label>
        <input
          id="login-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@school.edu"
          className="min-h-12 rounded-xl border border-line bg-surface px-4 text-white placeholder:text-cool-gray focus-visible:border-white focus-visible:outline-none"
        />
        <button type="submit" disabled={status === "sending"} className={buttonClass("secondary", "w-full")}>
          {status === "sending" ? "Sending…" : "Email me a link"}
        </button>
        {status === "error" ? (
          <p role="alert" className="text-sm text-coral">
            Couldn&apos;t send the link. Try again.
          </p>
        ) : null}
      </form>
    </div>
  );
}
