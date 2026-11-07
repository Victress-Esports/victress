import type { Metadata } from "next";
import { seo } from "@/content/seo";
import { privateMetadata } from "@/lib/seo";
import Link from "next/link";
import { JoinTeamButton } from "@/components/app/JoinTeamButton";
import { Logo } from "@/components/brand/Logo";
import { ButtonLink, buttonClass } from "@/components/ui/Button";
import { supabasePublic } from "@/lib/supabase/public";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = privateMetadata(seo.app.join.title, seo.app.join.description);

export default async function Join({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const safeCode = /^[a-z0-9]{6,32}$/i.test(code) ? code : "";

  const { data } = safeCode ? await supabasePublic().rpc("team_invite_info", { p_code: safeCode }) : { data: null };
  const info = data as { name: string; member_count: number } | null;

  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();

  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-4 py-16">
      <Logo />
      {info ? (
        <>
          <div>
            <h1 className="font-display text-4xl font-bold leading-tight">Join {info.name}.</h1>
            <p className="mt-3 text-mute">
              <span className="tnum">{info.member_count}</span> {info.member_count === 1 ? "player" : "players"} on the roster.
            </p>
          </div>
          {user ? (
            <JoinTeamButton code={safeCode} teamName={info.name} />
          ) : (
            <div className="flex flex-col gap-3">
              <ButtonLink href={`/login?next=${encodeURIComponent(`/join/${safeCode}`)}`} className="w-full">
                Sign in to join
              </ButtonLink>
              <p className="text-sm text-mute">New here? Signing in creates your free profile first.</p>
            </div>
          )}
        </>
      ) : (
        <div>
          <h1 className="font-display text-4xl font-bold">This invite isn&apos;t valid.</h1>
          <p className="mt-3 text-mute">Ask your team owner for a new link.</p>
          <Link href="/" className={buttonClass("secondary", "mt-6")}>
            Go home
          </Link>
        </div>
      )}
    </main>
  );
}
