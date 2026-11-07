import type { Metadata } from "next";
import { DashboardNav } from "@/components/app/DashboardNav";
import { Logo } from "@/components/brand/Logo";
import { buttonClass } from "@/components/ui/Button";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <header className="flex items-center justify-between">
        <Logo href="/dashboard" />
        <form action="/auth/signout" method="post">
          <button type="submit" className={buttonClass("ghost", "min-h-11 px-3 text-sm text-mute")}>
            Sign out
          </button>
        </form>
      </header>
      <div className="mt-6">
        <DashboardNav />
      </div>
      <main id="main" className="mt-8">
        {children}
      </main>
    </div>
  );
}
