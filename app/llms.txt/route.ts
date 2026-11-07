import { siteFor } from "@/lib/hosts";
import { APP_URL, MARKETING_URL } from "@/lib/urls";

// /llms.txt: a plain-text summary for AI assistants and crawlers (an informal convention, https://llmstxt.org).
// Facts only: what works today is separated from what is planned. Served on the marketing domain only.
const body = () => `# Victress

> Victress is an esports player development and recruitment platform. Today players can create an account and enter their own stats, and teams can manage a roster. Profiles are private by default; public directory and sharing links are disabled during the initial pilot phase. Marketing site: ${MARKETING_URL}. Product: ${APP_URL}.

## Why Victress exists
- Women in Esports: an intentional shared value commitment, delivered through the same three products: Player Resume for visibility (in development), Scrim Intelligence for development (coming soon) and Scout Desk for opportunity (coming soon). It is not a separate product, program or company, and Victress is not currently offering funding, coaching, mentorship, scholarships or recruitment.

## What works today
- Player accounts: sign in, choose a name, add your games, roles and ranks, and enter your own stats. Profiles are private by default; public directory and sharing links are disabled during the initial pilot phase.
- Six supported games: VALORANT, Counter-Strike 2, Rocket League, League of Legends, Apex Legends, Overwatch 2.
- Stats are entered by players and labeled "Self-reported". There is no automatic game data or verification yet.
- Teams: create a team, share an invite link, roster of up to 10 (8 players and 2 coaches).
- A free plan (Rookie).

## Coming soon (not available yet)
- Pro, Team and Scout paid plans (join the waitlist on the pricing page).
- Player Resume (in development): a shareable player profile, tournament history and highlights.
- Public player profiles, per game leaderboards and sharing links (disabled during the initial pilot phase).
- Scout Desk for recruiting, scrim analytics, progress charts, team standings and team portfolios.
- Automatic game data. Whether and how it will work for each game has not been confirmed.

## Pages
- [Home](${MARKETING_URL}): the product at a glance, with a questions section.
- [Platform](${MARKETING_URL}/platform): how Scrim Intelligence, Player Resume and Scout Desk fit together, with what is available today and what is planned.
- [Women in Esports](${MARKETING_URL}/women-in-esports): an intentional shared value commitment delivered through the same three products. It is not currently offering funding, coaching, mentorship, scholarships or recruitment.
- [Founding Design Partner pilot](${MARKETING_URL}/design-partner): a 4 to 6 week pilot for women's competitive rosters, Game Changers teams and collegiate programs. Applying does not guarantee a place.
- [Pricing](${MARKETING_URL}/pricing): plans and pricing questions.
- [For teams](${MARKETING_URL}/teams): running a club roster.
- [About](${MARKETING_URL}/about): what Victress is, what is available now and what is planned.
- [Partnerships](${MARKETING_URL}/partnerships): for collegiate programs, competitive teams and tournament organizers.
- [Contact](${MARKETING_URL}/contact): hello@victressesports.com.
- [Privacy](${MARKETING_URL}/privacy) and [Terms](${MARKETING_URL}/terms): draft text, pending legal review.

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
