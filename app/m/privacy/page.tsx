import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/LegalPage";
import { privacyDoc } from "@/content/legal";
import { seo } from "@/content/seo";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ ...seo.marketing.privacy, path: "/privacy", image: "home" });

export default function Privacy() {
  return <LegalPage doc={privacyDoc} crumb="Privacy" path="/privacy" />;
}
