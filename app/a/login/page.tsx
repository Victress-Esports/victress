import type { Metadata } from "next";
import { seo } from "@/content/seo";
import { privateMetadata } from "@/lib/seo";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { LoginForm } from "@/components/app/LoginForm";
import { copy } from "@/content/copy";
import { safeNext } from "@/lib/auth";
import { checkHandle } from "@/lib/handles";
import { getRole } from "@/lib/roles";
import { supabaseServer } from "@/lib/supabase/server";
import { marketingUrl } from "@/lib/urls";

export const metadata: Metadata = privateMetadata(seo.app.login.title, seo.app.login.description);

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ claim?: string; next?: string; error?: string; role?: string; deleted?: string }>;
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
  const role = getRole(sp.role);

  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-4 py-16">
      <Logo />
      <div>
        <h1 className="font-display text-4xl font-bold leading-tight">
          {claim ? `Claim ${claim}.` : "Sign in or create your account."}
        </h1>
        {claim ? <p className="mt-3 text-mute">{`Sign in or create your account to claim ${claim}.`}</p> : null}
        {role ? <p className="mt-3 text-mute">{`Creating an account as: ${role.title}.`}</p> : null}
      </div>
      {sp.deleted ? (
        <p role="status" className="rounded-xl border border-line bg-surface px-4 py-3 text-sm">
          Your account and data were deleted.
          {sp.deleted === "partial" ? " We could not remove your email list signup automatically. Email hello@victressesports.com and we will remove it." : ""}
        </p>
      ) : null}
      {sp.error ? (
        <p role="alert" className="rounded-xl border border-line bg-surface px-4 py-3 text-sm text-coral">
          That link didn&apos;t work. Try again.
        </p>
      ) : null}
      <LoginForm claim={claim} next={next} role={role?.id ?? ""} />
      <p className="text-xs text-mute">
        {copy.auth.ageNotice}{" "}
        <a href={marketingUrl("/terms")} className="font-semibold text-white underline underline-offset-2">
          {copy.auth.terms}
        </a>{" "}
        {copy.auth.and}{" "}
        <a href={marketingUrl("/privacy")} className="font-semibold text-white underline underline-offset-2">
          {copy.auth.privacy}
        </a>
        .
      </p>
    </main>
  );
}
