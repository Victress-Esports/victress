// Page titles and meta descriptions. One place to edit.
// Rules: title under 60 characters, description under 160, plain voice, never claim a feature that isn't live.
// scripts/seo-audit.mjs checks the lengths on the rendered pages.
export const seo = {
  marketing: {
    home: {
      title: "Esports Player Development and Recruitment | Victress",
      description: "Esports player development and recruitment for players, teams and scouts. Accounts and rosters work today. Scrim analysis and Scout Desk are coming soon.",
    },
    pricing: {
      title: "Pricing and Plans | Victress",
      description: "Plans for esports players, teams and scouts. Rookie is free. Pro, Team and Scout are coming soon, and you can join the waitlist.",
    },
    teams: {
      title: "Team Rosters for Esports Clubs | Victress",
      description: "Start an esports team, invite players with a link and see your whole roster in one place. Shared scrim review is coming soon.",
    },
    about: {
      title: "About Our Esports Platform | Victress",
      description: "What Victress is and who it serves: esports players, teams, coaches and scouts. See what works today and what is coming soon.",
    },
    platform: {
      title: "Esports Platform Products | Victress",
      description: "How Scrim Intelligence, Player Resume and Scout Desk fit together for esports players and teams. Each is labeled as in development or coming soon.",
    },
    womenInEsports: {
      title: "Women in Esports | Victress",
      description: "How Victress uses Player Resume, Scrim Intelligence and Scout Desk to address barriers women in competitive esports face. See what is available now.",
    },
    designPartner: {
      title: "Design Partner Pilot for Esports Teams | Victress",
      description: "A 4 to 6 week pilot for women's rosters, Game Changers teams and collegiate programs. Scrim Intelligence is coming soon. Applying does not guarantee a place.",
    },
    partnerships: {
      title: "Esports Partnerships | Victress",
      description: "Partnership conversations for collegiate esports programs, competitive teams and tournament organizers.",
    },
    contact: {
      title: "Contact the Team | Victress",
      description: "Contact Victress: apply to the design partner pilot, join early access as a player, or email the team.",
    },
    privacy: {
      title: "Privacy Policy | Victress",
      description: "How Victress handles your email and the profile details you choose to share. Draft text, pending legal review.",
    },
    terms: {
      title: "Terms of Use | Victress",
      description: "The rules for using Victress: you must be 13 or older, and self-reported stats are labeled and not verified. Draft text, pending legal review.",
    },
  },
  app: {
    home: {
      title: "Create an Esports Player Account | Victress",
      description: "Create a Victress account, pick your name, add your games and enter your own stats. Profiles are private by default.",
    },
    login: {
      title: "Sign In | Victress",
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
  description: `${gameName} leaderboards are coming soon. Stats on Victress are entered by players and labeled Self-reported.`,
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
