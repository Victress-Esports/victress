import type { Metadata } from "next";
import { seo } from "@/content/seo";
import { privateMetadata } from "@/lib/seo";
import Link from "next/link";
import { JoinTeamButton } from "@/components/app/JoinTeamButton";
import { Logo } from "@/components/brand/Logo";
import { ButtonLink, buttonClass } from "@/components/ui/Button";
import { headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { rateLimit } from "@/lib/ratelimit";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = privateMetadata(seo.app.join.title, seo.app.join.description);

export default async function Join({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const safeCode = /^[a-z0-9]{6,32}$/i.test(code) ? code : "";

  // The lookup is server only (migration 20261107000600): the service role resolves the code, behind a per IP limit,
  // so guesses cannot be tested through the database's public API and cannot be tested here faster than the limit allows.
  // A limited visitor sees the same page as for an unknown code, so nothing reveals whether a code exists.
  let info: { name: string; member_count: number } | null = null;
  let limited = false;
  if (safeCode) {
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
    if (!rateLimit(`join:${ip}`, 20, 10 * 60_000)) {
      limited = true;
    } else {
      const { data } = (await supabaseAdmin()?.rpc("team_invite_info", { p_code: safeCode })) ?? { data: null };
      info = data as { name: string; member_count: number } | null;
    }
  }

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
          {limited && <p className="mt-2 text-sm text-mute">Too many attempts from this connection. Try again in a few minutes.</p>}
          <Link href="/" className={buttonClass("secondary", "mt-6")}>
            Go home
          </Link>
        </div>
      )}
    </main>
  );
}
