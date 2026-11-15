import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { LegalPage } from "@/components/marketing/LegalPage";
import { privacyDoc } from "@/content/legal";
import { seo } from "@/content/seo";
import { pageMetadata } from "@/lib/seo";
import { MARKETING_URL, marketingUrl } from "@/lib/urls";

// The same policy as victressesports.com/privacy, from the same source (content/legal.ts), so the two cannot drift.
// Public, no sign in. The canonical is the marketing page, so search engines treat the two addresses as one document.
const canonical = `${MARKETING_URL}/privacy`;
const base = pageMetadata({ ...seo.marketing.privacy, path: canonical, image: "home" });
export const metadata: Metadata = { ...base, openGraph: { ...base.openGraph, url: canonical } };

export default function AppPrivacy() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-4 py-8 sm:px-6">
      <header className="flex items-center justify-between">
        <Logo href="/" />
      </header>
      <main id="main" className="flex-1">
        <LegalPage doc={privacyDoc} crumb="Privacy" path="/privacy" breadcrumbs={false} />
      </main>
      <footer className="flex flex-wrap gap-x-6 gap-y-1 border-t border-line pt-6 text-sm text-mute">
        <a href={marketingUrl("/terms")} className="inline-flex min-h-11 items-center hover:text-white">Terms</a>
        <Link href="/privacy" aria-current="page" className="inline-flex min-h-11 items-center text-white">Privacy</Link>
        <a href={marketingUrl("/refunds")} className="inline-flex min-h-11 items-center hover:text-white">Cancellation and Refunds</a>
      </footer>
    </div>
  );
}
