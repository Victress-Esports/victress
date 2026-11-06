import type { Metadata } from "next";
import { Logo } from "@/components/brand/Logo";
import { ClaimInput } from "@/components/marketing/ClaimInput";
import { copy } from "@/content/copy";

export const metadata: Metadata = {
  title: { absolute: "Victress. Claim your name." },
  alternates: { canonical: "/" },
};

// Placeholder product home for M1. Sign-in, onboarding and the dashboard arrive in M2 and M3.
export default function AppHome() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-10 px-4 py-16">
      <Logo />
      <h1 className="font-display text-5xl font-bold leading-tight">{copy.home.hero.title}</h1>
      <ClaimInput id="claim-app" />
    </div>
  );
}
