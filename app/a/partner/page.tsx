import type { Metadata } from "next";
import { Logo } from "@/components/brand/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { privateMetadata } from "@/lib/seo";
import { marketingUrl } from "@/lib/urls";

export const metadata: Metadata = privateMetadata("Become a Partner | Victress", "Partner registration is not open yet.");

/**
 * Where "Become a Partner" lands (the Partner brief: victress.gg/partner). Partner is an organization account, separate from
 * player accounts, with its own registration, plan and verification. That registration is built on the Partner branch and is not
 * live, so this page says so plainly: it creates no account, collects nothing and promises no workspace.
 * When the Partner platform launches, this route becomes the organization registration.
 */
export default function BecomePartner() {
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-4 py-16">
      <Logo href={marketingUrl("/")} />
      <div>
        <h1 className="font-display text-4xl font-bold leading-tight">Partner registration is not open yet.</h1>
        <p className="mt-3 text-mute">Organizations register separately from player accounts. Registration opens with the Partner platform.</p>
      </div>
      <div>
        <ButtonLink href={marketingUrl("/partnerships")} variant="secondary">
          Back to Partnerships
        </ButtonLink>
      </div>
    </main>
  );
}
