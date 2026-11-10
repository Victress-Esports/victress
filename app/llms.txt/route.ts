import { siteFor } from "@/lib/hosts";
import { APP_URL, MARKETING_URL } from "@/lib/urls";

// /llms.txt: a plain-text summary for AI assistants and crawlers (an informal convention, https://llmstxt.org).
// Present tense, no status language. A product that is not built carries one plain "Coming soon" label next to it. Served on the marketing domain only.
const body = () => `# Victress

> Victress is an esports player development and recruitment platform for players, teams, coaches and collegiate programs. Marketing site: ${MARKETING_URL}. Product: ${APP_URL}.

## Why Victress exists
- Women in Esports: an intentional shared value commitment within Victress, delivered through the same three products: Player Resume for visibility, Scrim Intelligence (Coming soon) for development and Scout Desk (Coming soon) for opportunity. It is not a separate product, program or company, and Victress is not currently offering funding, coaching, mentorship, scholarships or recruitment.

## What Victress does
- Player accounts: sign in, choose a name, and add your games, roles and ranks. Profiles are private by default.
- Player Resume: your games, roles, ranks, tournaments and highlights in one resume you control.
- Six supported games: VALORANT, Counter-Strike 2, Rocket League, League of Legends, Apex Legends, Overwatch 2.
- Teams: create a team, share an invite link, roster of up to 10 (8 players and 2 coaches).
- A free plan (Rookie). Pro, Team and Scout plans: Coming soon.
- Scrim Intelligence: private practice into performance information. Coming soon.
- Scout Desk: discovery and evaluation for teams, coaches and collegiate programs. Coming soon.

## Pages
- [Home](${MARKETING_URL}): what Victress is, with a questions section.
- [Platform](${MARKETING_URL}/platform): how Scrim Intelligence, Player Resume and Scout Desk fit together.
- [Women in Esports](${MARKETING_URL}/women-in-esports): an intentional shared value commitment delivered through the same three products. It is not currently offering funding, coaching, mentorship, scholarships or recruitment.
- [Founding Design Partner pilot](${MARKETING_URL}/design-partner): a 4 to 6 week pilot for women's competitive rosters, Game Changers teams and collegiate programs. Applying does not guarantee a place.
- [Pricing](${MARKETING_URL}/pricing): plans and pricing questions.
- [For teams](${MARKETING_URL}/teams): running a club roster.
- [About](${MARKETING_URL}/about): what Victress is and what it does.
- [Partnerships](${MARKETING_URL}/partnerships): Partner accounts for organizations: four plans, sign up and start in your dashboard.
- [Contact](${MARKETING_URL}/contact): hello@victressesports.com.
- [Privacy](${MARKETING_URL}/privacy), [Terms](${MARKETING_URL}/terms) and [Cancellation and Refunds](${MARKETING_URL}/refunds): how Victress handles data, the rules for using it, and billing.

## Good to know
- Player profiles are private by default and are not indexed by search engines.
- Sample content on the website is labeled "Sample". It is not real player data.
- Minimum age: 13 or older.
`;

export function GET(req: Request) {
  if (siteFor(req.headers.get("host")) !== "m") return new Response("Not found", { status: 404 });
  return new Response(body(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
