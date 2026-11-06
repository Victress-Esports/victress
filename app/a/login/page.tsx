import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { LoginForm } from "@/components/app/LoginForm";
import { safeNext } from "@/lib/auth";
import { checkHandle } from "@/lib/handles";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ claim?: string; next?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const next = safeNext(sp.next, "");

  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (user) redirect(next || "/dashboard");

  const { verdict, handle } = checkHandle(sp.claim ?? "");
  const claim = verdict === "ok" ? handle : "";

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-4 py-16">
      <Logo />
      <div>
        <h1 className="font-display text-4xl font-bold leading-tight">
          {claim ? `Claim ${claim}.` : "Welcome back."}
        </h1>
        <p className="mt-3 text-mute">{claim ? `victress.gg/${claim} is one tap away.` : "Sign in to your profile."}</p>
      </div>
      {sp.error ? (
        <p role="alert" className="rounded-xl border border-line bg-surface px-4 py-3 text-sm text-coral">
          That link didn&apos;t work. Try again.
        </p>
      ) : null}
      <LoginForm claim={claim} next={next} />
    </div>
  );
}
