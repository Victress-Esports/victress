import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ConsentForm } from "@/components/app/ConsentForm";
import { Logo } from "@/components/brand/Logo";
import { requireUser } from "@/lib/auth";
import { consentStatus } from "@/lib/consent";
import { privateMetadata } from "@/lib/seo";
import { marketingUrl } from "@/lib/urls";

export const metadata: Metadata = privateMetadata("Terms and Privacy | Victress", "Confirm your age and accept the Terms and Privacy Policy.");

export default async function Consent() {
  const { sb, user } = await requireUser({ gate: false });
  const { status, returning } = await consentStatus(sb, user.id);
  if (status === "ok" || status === "unavailable") redirect("/dashboard");
  const askAge = status === "needs_age";

  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-4 py-16">
      <Logo href="/" />
      <div>
        <h1 className="font-display text-4xl font-bold leading-tight">{returning ? "Our Terms or Privacy Policy changed." : "Before you start."}</h1>
        <p className="mt-3 text-mute">
          {returning
            ? "Please read and accept the updated documents to keep using Victress."
            : "Victress is for players 13 and older. Confirm your age and accept the Terms and Privacy Policy to continue."}
        </p>
      </div>
      <ConsentForm askAge={askAge} termsUrl={marketingUrl("/terms")} privacyUrl={marketingUrl("/privacy")} />
    </main>
  );
}
