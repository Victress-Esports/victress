import type { Metadata } from "next";
import { Footer, Nav } from "@/components/marketing/Chrome";
import { MARKETING_URL } from "@/lib/urls";

export const metadata: Metadata = {
  metadataBase: new URL(MARKETING_URL),
  description: "Turn performance into progress. Claim your name, build your player profile, and see where you stand.",
  openGraph: {
    siteName: "Victress",
    type: "website",
    images: [{ url: "/api/og", width: 1200, height: 630, alt: "Victress. Perform. Compete. Rise." }],
  },
  twitter: { card: "summary_large_image", images: ["/api/og"] },
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main id="main">{children}</main>
      <Footer />
    </>
  );
}
