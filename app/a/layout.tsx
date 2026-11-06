import type { Metadata } from "next";
import { APP_URL } from "@/lib/urls";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  description: "Your Victress player profile, stats and rank.",
  openGraph: {
    siteName: "Victress",
    type: "website",
    images: [{ url: "/api/og", width: 1200, height: 630, alt: "Victress. Perform. Compete. Rise." }],
  },
  twitter: { card: "summary_large_image", images: ["/api/og"] },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <main id="main">{children}</main>;
}
