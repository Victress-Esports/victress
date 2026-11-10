// Page titles and meta descriptions. One place to edit.
// Rules: title under 60 characters, description under 160, plain voice, never claim a feature that isn't live.
// scripts/seo-audit.mjs checks the lengths on the rendered pages.
export const seo = {
  marketing: {
    home: {
      title: "Esports Player Development and Recruitment | Victress",
      description: "Esports player development and recruitment for players, teams, coaches and collegiate programs. Create an account with source labeled stats and manage rosters.",
    },
    pricing: {
      title: "Pricing and Plans | Victress",
      description: "Victress plans for esports players, teams and coaches. Rookie is free to use. See what each plan includes.",
    },
    teams: {
      title: "Team Rosters for Esports Clubs | Victress",
      description: "Start an esports team, invite players with a link and see your whole roster in one place.",
    },
    about: {
      title: "About Our Esports Platform | Victress",
      description: "What Victress is and who it serves: esports players, teams, coaches and collegiate programs. See what works today.",
    },
    platform: {
      title: "Esports Platform Products | Victress",
      description: "How Victress helps esports players and teams: player accounts, stats labeled by source and team rosters, in one place.",
    },
    womenInEsports: {
      title: "Women in Esports | Victress",
      description: "Women in Esports is an intentional shared value commitment within Victress, delivered through the same products that serve every player and team.",
    },
    designPartner: {
      title: "Design Partner Pilot for Esports Teams | Victress",
      description: "A 4 to 6 week pilot for women's rosters, Game Changers teams and collegiate programs. See what partners receive and what we ask. Places are not guaranteed.",
    },
    partnerships: {
      title: "Partner with Victress | Women in Esports",
      description: "Support player development, recruitment and competitive players in esports. Partner with Victress to open doors in collegiate gaming.",
    },
    contact: {
      title: "Contact the Team | Victress",
      description: "Contact Victress: start a partnership conversation, apply to the design partner pilot, request access as a player, or email the team.",
    },
    privacy: {
      title: "Privacy Policy | Victress",
      description: "What Victress collects, why, who sees it and how you control it. Profiles are private by default and we do not sell your data.",
    },
    refunds: {
      title: "Cancellation and Refunds | Victress",
      description: "How to cancel a paid plan, when refunds apply, and what happens if a payment fails.",
    },
    terms: {
      title: "Terms of Use | Victress",
      description: "The rules for using Victress: who can use it, acceptable use, reporting abuse, payments and how accounts end.",
    },
  },
  app: {
    home: {
      title: "Create an Esports Player Account | Victress",
      description: "Create a Victress account, pick your name and add your games, roles and ranks. Profiles are private by default.",
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

/** Public profile pages. Never longer than the limits, whatever the player typed. */
export function profileSeo(p: { name: string | null; handle: string; facts: string; bio?: string | null }) {
  // No display name, or a name that is just the handle: "@handle on Victress" says it once.
  const full = p.name && p.name !== p.handle ? `${p.name} (@${p.handle}) on Victress` : `@${p.handle} on Victress`;
  const title = full.length <= 60 ? full : `@${p.handle} on Victress`;
  const base = p.facts ? `${p.facts}.` : "Player profile on Victress.";
  const description = clip(p.bio ? `${base} ${p.bio}` : base, 160);
  return { title, description };
}

export function clip(s: string, max: number) {
  const flat = s.replace(/\s+/g, " ").trim();
  return flat.length <= max ? flat : flat.slice(0, max - 1).trimEnd() + "…";
}
