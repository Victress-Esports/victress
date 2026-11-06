import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingWizard } from "@/components/app/OnboardingWizard";
import { Logo } from "@/components/brand/Logo";
import { GAME_LIST } from "@/content/games";
import { PLACEHOLDER_HANDLE, requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Welcome", robots: { index: false } };

export default async function Onboarding() {
  const { sb, user } = await requireUser();
  const { data: profile } = await sb.from("profiles").select("handle").eq("id", user.id).single();
  const needsName = !profile || PLACEHOLDER_HANDLE.test(profile.handle);
  if (!needsName && user.user_metadata?.onboarded) redirect("/dashboard");

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col gap-10 px-4 py-10 sm:py-16">
      <Logo href="/dashboard" />
      <OnboardingWizard games={GAME_LIST} needsName={needsName} />
    </div>
  );
}
