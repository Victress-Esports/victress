import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/LegalPage";
import { termsDoc } from "@/content/legal";
import { seo } from "@/content/seo";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ ...seo.marketing.terms, path: "/terms", image: "home" });

export default function Terms() {
  return <LegalPage doc={termsDoc} crumb="Terms" path="/terms" />;
}
