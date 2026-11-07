import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { headers } from "next/headers";
import { Analytics as TagAnalytics } from "@/components/analytics/Analytics";
import { analyticsFor } from "@/lib/analytics/config";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const space = Space_Grotesk({ subsets: ["latin"], variable: "--font-space", display: "swap", weight: ["500", "700"] });

export const viewport: Viewport = { themeColor: "#171717", colorScheme: "dark" };

export const metadata: Metadata = {
  applicationName: "Victress",
  title: { default: "Victress | Esports Player Profiles & Performance", template: "%s | Victress" },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Each site has its own tag container (lib/analytics/config.ts). Off unless ANALYTICS_MODE enables it for this host.
  const tags = analyticsFor((await headers()).get("host"));
  return (
    <html lang="en" className={`${inter.variable} ${space.variable}`}>
      <body className="min-h-dvh bg-carbon antialiased">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {children}
        {tags ? <TagAnalytics site={tags.site} gtmId={tags.gtmId} /> : null}
        {/* The script is served by Vercel only (enable Analytics in the project). Elsewhere it would 404. */}
        {process.env.VERCEL ? <Analytics /> : null}
      </body>
    </html>
  );
}
