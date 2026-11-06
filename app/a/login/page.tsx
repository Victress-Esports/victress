import type { Metadata } from "next";
import { Logo } from "@/components/brand/Logo";
import { checkHandle } from "@/lib/handles";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

// Stub for M1 so the claim flow has somewhere to land. Real auth ships in M2.
export default async function Login({ searchParams }: { searchParams: Promise<{ claim?: string }> }) {
  const { claim } = await searchParams;
  const { verdict, handle } = checkHandle(claim ?? "");
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4 py-16">
      <Logo />
      <h1 className="font-display text-4xl font-bold">
        {verdict === "ok" ? `Almost yours, ${handle}.` : "Sign in"}
      </h1>
      <p className="text-mute">Sign-in opens very soon. Your name will be waiting.</p>
    </div>
  );
}
