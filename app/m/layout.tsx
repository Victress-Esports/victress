import type { Metadata } from "next";
import { Footer, Nav } from "@/components/marketing/Chrome";
import { seo } from "@/content/seo";
import { MARKETING_URL } from "@/lib/urls";

// Every page sets its own title, description, canonical and social tags (lib/seo.ts); these are only a fallback.
export const metadata: Metadata = {
  metadataBase: new URL(MARKETING_URL),
  description: seo.marketing.home.description,
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Nav />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
