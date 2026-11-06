// Page titles and meta descriptions. One place to edit.
// Rules: title under 60 characters, description under 160, plain voice, never claim a feature that isn't live.
// scripts/seo-audit.mjs checks the lengths on the rendered pages.
export const seo = {
  marketing: {
    home: {
      title: "Victress | Turn performance into progress",
      description: "Claim your name and build a shareable player profile. Track your stats in VALORANT, CS2 and four more games.",
    },
    pricing: {
      title: "Victress pricing: free to start",
      description: "Rookie is free forever. Pro, Team and Scout are coming soon. Join the waitlist and we'll email you once when they open.",
    },
    teams: {
      title: "Victress for teams: run your club in one place",
      description: "Start a team, share one invite link, and see your whole roster in one place. Free for founding clubs in their first season.",
    },
    about: {
      title: "About Victress",
      description: "Players put in the work but have nowhere to show it. Victress turns results into a profile you own. We only promise what's live.",
    },
    privacy: {
      title: "Privacy | Victress",
      description: "How Victress handles your email and the profile details you choose to share. Draft text, pending legal review.",
    },
    terms: {
      title: "Terms | Victress",
      description: "The rules for using Victress: you must be 13 or older, and self-reported stats are labeled and not verified. Draft text, pending legal review.",
    },
  },
  app: {
    home: {
      title: "Claim your name | Victress",
      description: "Pick your name on victress.gg, add your game, and share one player profile anywhere.",
    },
    login: {
      title: "Sign in | Victress",
      description: "Sign in with Discord, Google or an email link. No passwords.",
    },
    onboarding: {
      title: "Welcome | Victress",
      description: "Pick your game, role and rank. Skip any step.",
    },
    dashboard: {
      title: "Dashboard | Victress",
      description: "Your Victress profile, live preview and next steps.",
    },
    editProfile: {
      title: "Edit profile | Victress",
      description: "Update your photo, bio, games and name.",
    },
    stats: {
      title: "Your stats | Victress",
      description: "Add and review your self-reported stats.",
    },
    team: {
      title: "Team | Victress",
      description: "Start a team, share an invite link and manage your roster.",
    },
    join: {
      title: "Join your team | Victress",
      description: "Join your team on Victress with one tap.",
    },
    notFound: {
      title: "Page not found | Victress",
      description: "That page doesn't exist. Head back to the start.",
    },
  },
} as const;

/** Leaderboard pages are built per game. */
export const leaderboardSeo = (gameName: string) => ({
  title: `${gameName} leaderboard | Victress`,
  description: `See how ${gameName} players on Victress compare. Stats are entered by players and labeled Self-reported.`,
});

/** Public profile pages. Never longer than the limits, whatever the player typed. */
export function profileSeo(p: { name: string | null; handle: string; facts: string; bio?: string | null }) {
  // No display name, or a name that is just the handle: "@handle on Victress" says it once.
  const full = p.name && p.name !== p.handle ? `${p.name} (@${p.handle}) on Victress` : `@${p.handle} on Victress`;
  const title = full.length <= 60 ? full : `@${p.handle} on Victress`;
  const base = p.facts ? `${p.facts}. Self-reported stats.` : "Player profile on Victress.";
  const description = clip(p.bio ? `${base} ${p.bio}` : base, 160);
  return { title, description };
}

export function clip(s: string, max: number) {
  const flat = s.replace(/\s+/g, " ").trim();
  return flat.length <= max ? flat : flat.slice(0, max - 1).trimEnd() + "…";
}
