import type { Metadata } from "next";

/** Keys for the generic social cards served by /api/og (an allow-list, so nobody can print arbitrary text on our image). */
export type OgKey = "home" | "pricing" | "teams" | "about" | "app" | "leaderboard";

export const ogImage = (key: OgKey) => `/api/og?page=${key}`;

/** Describes what each social card shows (the text on app/api/og/route.tsx). */
const OG_ALT: Record<OgKey, string> = {
  home: "Victress. Turn practice into progress. An esports player development and recruitment platform.",
  pricing: "Victress pricing. Free to start. Pro, Team and Scout are coming soon.",
  teams: "Victress for teams. Run your club in one place. One invite link. One roster.",
  about: "About Victress. Show the work. A profile you own, built on stats you enter.",
  app: "Victress. Claim your name. One link. Your whole story.",
  leaderboard: "Victress leaderboards. Know where you stand. Self-reported stats, per game.",
};

interface PageMeta {
  title: string;
  description: string;
  /** Path on this site, e.g. "/pricing". Resolved against the layout's metadataBase. */
  path: string;
  /** Social image: a known card key, or a full path (profiles). */
  image?: OgKey | { url: string; alt: string };
  type?: "website" | "profile";
}

/** Canonical, Open Graph and Twitter tags for an indexable page. The title is used exactly as given. */
export function pageMetadata({ title, description, path, image = "home", type = "website" }: PageMeta): Metadata {
  const img = typeof image === "string" ? { url: ogImage(image), alt: OG_ALT[image] } : image;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: path },
    openGraph: {
      type,
      siteName: "Victress",
      locale: "en_US",
      title,
      description,
      url: path,
      images: [{ url: img.url, width: 1200, height: 630, alt: img.alt }],
    },
    twitter: { card: "summary_large_image", title, description, images: [img.url] },
  };
}

/** Pages behind sign-in or tied to one person's session: unique title and description, never indexed. */
export function privateMetadata(title: string, description: string): Metadata {
  return {
    title: { absolute: title },
    description,
    robots: { index: false, follow: false },
  };
}
