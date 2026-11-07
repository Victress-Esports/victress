// Page titles and meta descriptions. One place to edit.
// Rules: title under 60 characters, description under 160, plain voice, never claim a feature that isn't live.
// scripts/seo-audit.mjs checks the lengths on the rendered pages.
export const seo = {
  marketing: {
    home: {
      title: "Victress | Esports Player Profiles & Performance",
      description:
        "Build your esports player profile, track performance, and showcase your competitive progress. Made for players, teams, and collegiate programs.",
    },
    pricing: {
      title: "Victress pricing: free to start",
      description: "Rookie is free forever. Pro, Team and Scout are coming soon. Join the waitlist and we'll email you once when they open.",
    },
    teams: {
      title: "Victress for teams: run your club in one place",
      description: "Start a team, share one invite link, and see your whole roster in one place. Shared scrim review is coming soon.",
    },
    about: {
      title: "About Victress",
      description: "Why Victress exists: infrastructure that turns competitive practice into evidence, recognition and opportunity. See what is available now and what is planned.",
    },
    platform: {
      title: "Victress platform: from practice to opportunity",
      description: "How Scrim Intelligence, Player Resume and Scout Desk work together. See what is available now and what is coming soon.",
    },
    womenInEsports: {
      title: "Women in Esports | Victress",
      description: "How Victress uses Player Resume, Scrim Intelligence and Scout Desk to address barriers women in competitive esports face. See what is available now.",
    },
    designPartner: {
      title: "Founding Design Partner pilot | Victress",
      description: "A 4 to 6 week pilot for women's rosters, Game Changers teams and collegiate programs. See what partners receive and what we ask.",
    },
    partnerships: {
      title: "Partnerships | Victress",
      description: "Partnership conversations for collegiate esports programs, competitive teams and tournament organizers.",
    },
    contact: {
      title: "Contact | Victress",
      description: "Contact Victress: apply to the design partner pilot, join early access as a player, or email the team.",
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
      description: "Your plan, modules and what is switched on.",
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
