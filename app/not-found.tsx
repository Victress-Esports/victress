import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import Link from "next/link";
import { Footer, Nav } from "@/components/marketing/Chrome";
import { buttonClass } from "@/components/ui/Button";
import { launchGame } from "@/content/games";
import { seo } from "@/content/seo";
import { siteFor } from "@/lib/hosts";
import { privateMetadata } from "@/lib/seo";

export const metadata: Metadata = privateMetadata(seo.app.notFound.title, seo.app.notFound.description);

/** One 404 for both domains: it reads the host and renders the marketing or product version. */
export default async function NotFound() {
  const site = siteFor((await headers()).get("host"), (await cookies()).get("v_site")?.value);

  if (site === "m") {
    return (
      <div className="flex min-h-dvh flex-col">
        <Nav />
        <main id="main" className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-start justify-center gap-4 px-4 py-24 sm:px-6">
          <p className="tnum font-display text-7xl font-bold text-crimson">404</p>
          <h1 className="font-display text-4xl font-bold">Page not found.</h1>
          <p className="text-mute">That page doesn&apos;t exist. Head back to the start.</p>
          <div className="mt-2 flex flex-wrap gap-3">
            <Link href="/" className={buttonClass("primary")}>
              Go home
            </Link>
            <Link href="/pricing" className={buttonClass("secondary")}>
              See pricing
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-md flex-col items-start justify-center gap-4 px-4">
      <p className="tnum font-display text-7xl font-bold text-crimson">404</p>
      <h1 className="font-display text-3xl font-bold">No player or page here.</h1>
      <p className="text-mute">Check the link, or claim the name yourself.</p>
      <div className="mt-2 flex flex-wrap gap-3">
        <Link href="/" className={buttonClass("primary")}>
          Claim your name
        </Link>
        <Link href={`/leaderboard/${launchGame().slug}`} className={buttonClass("secondary")}>
          Leaderboards
        </Link>
      </div>
    </main>
  );
}
