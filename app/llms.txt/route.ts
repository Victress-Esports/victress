import { siteFor } from "@/lib/hosts";
import { APP_URL, MARKETING_URL } from "@/lib/urls";

// /llms.txt: a plain-text summary for AI assistants and crawlers (an informal convention, https://llmstxt.org).
// Facts only: what works today is separated from what is planned. Served on the marketing domain only.
const body = () => `# Victress

> Victress is an esports player development and recruitment platform. Players build a shareable profile and log their stats; teams manage a roster. Marketing site: ${MARKETING_URL}. Product: ${APP_URL}.

## What works today
- Player profiles at ${APP_URL}/{handle}: name, avatar, bio, games, roles, ranks and stats, shareable by link.
- Six supported games: VALORANT, Counter-Strike 2, Rocket League, League of Legends, Apex Legends, Overwatch 2.
- Stats are entered by players and labeled "Self-reported". There is no automatic game data or verification yet.
- Teams: create a team, share an invite link, roster of up to 10 (8 players and 2 coaches).
- Leaderboards per game, which open once a game has 10 players.
- A free plan (Rookie).

## Coming soon (not available yet)
- Pro, Team and Scout paid plans (join the waitlist on the pricing page).
- Scout Desk for recruiting, scrim analytics, progress charts, team standings and team portfolios.
- Victress Women in Esports: an intentional shared value commitment (strategy section 4), delivered through the same three products: Player Resume for visibility (available now), Scrim Intelligence for development (coming soon) and Scout Desk for opportunity (coming soon). It is not a separate product, program or company, and Victress is not currently offering funding, coaching, mentorship, scholarships or recruitment.
- Automatic game data. Whether and how it will work for each game has not been confirmed.

## Pages
- [Home](${MARKETING_URL}): the product at a glance, with a questions section.
- [Platform](${MARKETING_URL}/platform): how Scrim Intelligence, Player Resume and Scout Desk fit together, with what is available today and what is planned.
- [Victress Women in Esports](${MARKETING_URL}/women-in-esports): a community initiative powered by Victress, in development. It is not currently offering funding, coaching, scholarships or recruitment.
- [Founding Design Partner pilot](${MARKETING_URL}/design-partner): a 4 to 6 week pilot for women's competitive rosters, Game Changers teams and collegiate programs. Applying does not guarantee a place.
- [Pricing](${MARKETING_URL}/pricing): plans and pricing questions.
- [For teams](${MARKETING_URL}/teams): running a club roster.
- [About](${MARKETING_URL}/about): what Victress is, what is available now and what is planned.
- [Partnerships](${MARKETING_URL}/partnerships): for collegiate programs, competitive teams and tournament organizers.
- [Contact](${MARKETING_URL}/contact): hello@victressesports.com.
- [Privacy](${MARKETING_URL}/privacy) and [Terms](${MARKETING_URL}/terms): draft text, pending legal review.

## Good to know
- Player profiles are not indexed by search engines unless the player turns that on.
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
