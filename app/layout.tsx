import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const space = Space_Grotesk({ subsets: ["latin"], variable: "--font-space", display: "swap", weight: ["500", "700"] });

export const viewport: Viewport = { themeColor: "#171717", colorScheme: "dark" };

export const metadata: Metadata = {
  applicationName: "Victress",
  title: { default: "Esports Player Development and Recruitment | Victress", template: "%s | Victress" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${space.variable}`}>
      <body className="min-h-dvh bg-carbon antialiased">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {children}
        {/* The script is served by Vercel only (enable Analytics in the project). Elsewhere it would 404. */}
        {process.env.VERCEL ? <Analytics /> : null}
      </body>
    </html>
  );
}
