import type { Metadata } from "next";
import { seo } from "@/content/seo";
import { APP_URL } from "@/lib/urls";

// Every page sets its own title, description and social tags (lib/seo.ts); these are only a fallback.
// Each page renders its own <main id="main">, so there is exactly one main landmark per page.
export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  description: seo.app.home.description,
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
