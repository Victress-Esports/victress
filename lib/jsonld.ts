import { getGame } from "@/content/games";
import { clip } from "@/content/seo";
import { APP_URL, MARKETING_URL } from "@/lib/urls";

const CONTEXT = "https://schema.org";

/** Organization + WebSite for the marketing home. Only facts that are already public on the site. */
export function organizationAndWebsite() {
  return {
    "@context": CONTEXT,
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${MARKETING_URL}/#organization`,
        name: "Victress",
        legalName: "Victress LLC",
        url: MARKETING_URL,
        logo: `${MARKETING_URL}/icon-512.png`,
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "customer support",
          email: process.env.RESEND_FROM_EMAIL ?? "hello@victressesports.com",
        },
      },
      {
        // The product itself (victress.gg). Only what exists today: a free plan, and features that are live.
        "@type": "WebApplication",
        "@id": `${APP_URL}/#app`,
        name: "Victress",
        url: APP_URL,
        description: "Esports player accounts and team rosters for VALORANT, Counter-Strike 2, Rocket League, League of Legends, Apex Legends and Overwatch 2.",
        operatingSystem: "Web",
        applicationCategory: "SportsApplication",
        publisher: { "@id": `${MARKETING_URL}/#organization` },
        offers: { "@type": "Offer", name: "Rookie", price: "0", priceCurrency: "USD" },
        featureList: ["Player accounts", "Six supported games", "Player Resume", "Team rosters with invite links"],
      },
      {
        "@type": "WebSite",
        "@id": `${MARKETING_URL}/#website`,
        name: "Victress",
        url: MARKETING_URL,
        inLanguage: "en-US",
        publisher: { "@id": `${MARKETING_URL}/#organization` },
      },
    ],
  };
}

/** FAQPage built from the same copy that is visible on the pricing page. */
export function faqPage(items: readonly { q: string; a: string }[]) {
  return {
    "@context": CONTEXT,
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({
      "@type": "Question",
      name: i.q,
      acceptedAnswer: { "@type": "Answer", text: i.a },
    })),
  };
}

/** `items` are in order, each with an absolute URL. */
export function breadcrumbs(items: { name: string; url: string }[]) {
  return {
    "@context": CONTEXT,
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: it.url })),
  };
}

export const marketingCrumbs = (name: string, path: string) =>
  breadcrumbs([
    { name: "Home", url: MARKETING_URL },
    { name, url: `${MARKETING_URL}${path}` },
  ]);

/**
 * ProfilePage + Person. Only fields shown on the public profile: name, handle, photo, bio, team and games.
 * Stats, rank and role are not marked up.
 */
export function profilePage(p: {
  handle: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  teamName: string | null;
  games: string[];
  createdAt: string | null;
  updatedAt: string | null;
}) {
  const url = `${APP_URL}/${p.handle}`;
  const gameNames = p.games.map((g) => getGame(g)?.name).filter((n): n is string => !!n);
  return {
    "@context": CONTEXT,
    "@type": "ProfilePage",
    url,
    ...(p.createdAt ? { dateCreated: p.createdAt } : {}),
    ...(p.updatedAt ? { dateModified: p.updatedAt } : {}),
    mainEntity: {
      "@type": "Person",
      "@id": `${url}#person`,
      name: p.displayName || p.handle,
      alternateName: p.handle,
      url,
      ...(p.avatarUrl ? { image: p.avatarUrl } : {}),
      ...(p.bio ? { description: clip(p.bio, 280) } : {}),
      ...(p.teamName ? { memberOf: { "@type": "Organization", name: p.teamName } } : {}),
      ...(gameNames.length ? { knowsAbout: gameNames } : {}),
    },
  };
}
