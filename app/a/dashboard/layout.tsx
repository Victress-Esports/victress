import type { Metadata } from "next";
import { DashboardNav } from "@/components/app/DashboardNav";
import { Logo } from "@/components/brand/Logo";
import { buttonClass } from "@/components/ui/Button";
import { requireUser } from "@/lib/auth";
import { marketingUrl } from "@/lib/urls";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { sb } = await requireUser();
  // The Partner link is for members only. If the Partner tables are not there yet, or the query fails, the link is simply not shown.
  const { data: partner } = await sb.from("partner_members").select("org_id").maybeSingle();
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
        <DashboardNav showPartner={!!partner} />
      </div>
      <main id="main" className="mt-8">
        {children}
      </main>
      <footer className="mt-16 flex flex-wrap gap-x-6 gap-y-1 border-t border-line pt-6 text-sm text-mute">
        <a href={marketingUrl("/terms")} className="inline-flex min-h-11 items-center hover:text-white">Terms</a>
        <a href={marketingUrl("/privacy")} className="inline-flex min-h-11 items-center hover:text-white">Privacy</a>
        <a href={marketingUrl("/refunds")} className="inline-flex min-h-11 items-center hover:text-white">Cancellation and Refunds</a>
      </footer>
    </div>
  );
}
