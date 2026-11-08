import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/LegalPage";
import { refundsDoc } from "@/content/legal";
import { seo } from "@/content/seo";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ ...seo.marketing.refunds, path: "/refunds", image: "home" });

export default function Refunds() {
  return <LegalPage doc={refundsDoc} crumb="Cancellation and Refunds" path="/refunds" />;
}
