// All marketing copy lives here. Rules: headline 2 to 6 words, one supporting line of 12 words or fewer,
// no paragraph over 2 sentences. Never claim a feature is live until it is.
export const copy = {
  // Official brand messaging. Use the pair together in the hero; elsewhere use the primary tagline sparingly.
  brand: {
    name: "Victress",
    tagline: "Turn practice into progress.",
    supporting: "Your stats. Your profile. Your competitive edge.",
  },

  nav: {
    links: [
      { href: "/pricing", label: "Pricing" },
      { href: "/teams", label: "For teams" },
      { href: "/about", label: "About" },
    ],
    cta: "Claim your name",
  },

  claim: {
    prefix: "victress.gg/",
    placeholder: "yourname",
    button: "Claim it",
    checking: "Checking…",
    available: "is available.",
    taken: "is taken. Try another.",
    invalid: "Use 3 to 20 letters, numbers or underscores.",
    reserved: "That name isn't available.",
    error: "Couldn't check right now. Try again.",
    label: "Choose your Victress name",
  },

  home: {
    hero: {
      title: "Turn practice into progress.",
      line: "Your stats. Your profile. Your competitive edge.",
    },
    steps: [
      { n: "1", title: "Claim your name." },
      { n: "2", title: "Add your game." },
      { n: "3", title: "Climb." },
    ],
    // One headline and one short line per scroll moment. The pictures do the rest.
    features: [
      { id: "profile", title: "One link. Your whole story.", line: "A player profile you can share anywhere." },
      { id: "progress", title: "See what's working.", line: "Track your stats and watch yourself improve." },
      { id: "leaderboard", title: "Know where you stand.", line: "Compare with your club and your community." },
    ],
    games: { title: "Six games. Pick yours.", line: "Roles and ranks match the game." },
    teams: {
      title: "Run your club like a pro team.",
      line: "One dashboard for every player.",
      cta: "Start your team",
    },
    soon: {
      eyebrow: "Coming soon",
      items: [
        { interest: "scrims" as const, title: "Scrim analytics", line: "Learn from every scrim." },
        { interest: "scout" as const, title: "Scout Desk", line: "Get found by programs." },
      ],
      cta: "Join the waitlist",
    },
    // Understanding the platform, not buying a plan (the pricing page has its own FAQ).
    // Only describe what exists today; anything unbuilt says so.
    faqTitle: "Questions, answered.",
    faq: [
      { q: "What is Victress?", a: "An esports player platform. Build a profile, log your stats, and compare on per-game leaderboards." },
      { q: "Which esports games does Victress support?", a: "VALORANT, Counter-Strike 2, Rocket League, League of Legends, Apex Legends and Overwatch 2." },
      {
        q: "How does Victress track player performance?",
        a: "You enter your stats and Victress keeps your history, labeled Self-reported. Progress charts and automatic game data are not available yet.",
      },
      {
        q: "Can players create competitive profiles?",
        a: "Yes. Claim your name, add your games, roles and ranks, and share one link. Search engines list it only if you turn that on.",
      },
      {
        q: "Can teams manage their players?",
        a: "Yes. Start a team, share an invite link, and see your roster's games and ranks. Team standings and portfolios are coming soon.",
      },
      {
        q: "How can recruiters discover players?",
        a: "Scout Desk is coming soon and is not available yet. Join the waitlist. Players can share their profile link today.",
      },
      { q: "Is Victress free to use?", a: "Yes. Rookie is free forever. Pro, Team and Scout are coming soon." },
    ],
    soonBadge: "Coming soon",
    final: { title: "Claim your name." },
  },

  pricing: {
    title: "Simple pricing.",
    line: "Start free.",
    monthly: "Monthly",
    annual: "Annual",
    save: "Save with annual",
    liveCta: "Start free",
    soonCta: "Join the waitlist",
    soonBadge: "Coming soon",
    faqTitle: "Questions",
    faq: [
      { q: "Is Victress free?", a: "Yes. Rookie is free forever." },
      { q: "Which games can I add?", a: "VALORANT, CS2, Rocket League, League of Legends, Apex Legends and Overwatch 2." },
      { q: "Where do my stats come from?", a: "You enter them. They're labeled Self-reported." },
      { q: "When do paid plans start?", a: "Not yet. Join the waitlist." },
      { q: "Can my club join for free?", a: "Founding clubs get their first season free." },
    ],
  },

  teams: {
    title: "Run your club like a pro team.",
    line: "One roster. One invite link.",
    cta: "Start your team",
    // `soon` items are not built yet and are shown as Coming soon.
    benefits: [
      { title: "One roster.", line: "Invite players with a link.", soon: false },
      { title: "One dashboard.", line: "See everyone's game and rank.", soon: false },
      { title: "Team standings.", line: "", soon: true },
      { title: "Team portfolio.", line: "", soon: true },
    ],
    soonBadge: "Coming soon",
    note: "First season free for founding clubs.",
  },

  about: {
    title: "Why Victress exists.",
    body: ["Players put in the work but have nowhere to show it.", "Victress gives you a profile you own."],
    cta: "Claim your name",
  },

  waitlist: {
    title: "Join the waitlist.",
    line: "We'll email you once, when it's ready.",
    emailLabel: "Email address",
    emailPlaceholder: "you@school.edu",
    submit: "Join",
    sending: "Joining…",
    done: "You're on the list. Check your inbox.",
    error: "Something went wrong. Try again.",
    close: "Close",
  },

  footer: {
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
    rights: "Victress LLC. All rights reserved.",
    trademarks: "Game names are trademarks of their owners. Victress is not affiliated with or endorsed by them.",
  },

  auth: {
    // Shown under the sign-in options, which is also how people sign up.
    ageNotice: "You must be 13 or older to use Victress. By continuing you agree to the",
    terms: "Terms",
    and: "and",
    privacy: "Privacy Policy",
  },

  legal: {
    privacy: {
      title: "Privacy",
      updated: "Placeholder. Final text is pending legal review.",
      body: [
        "We collect your email and the profile details you choose to share.",
        "We use only privacy-friendly analytics and set no advertising cookies.",
        "Write to hello@victressesports.com to see or delete your data.",
      ],
    },
    terms: {
      title: "Terms",
      updated: "Placeholder. Final text is pending legal review.",
      body: [
        "You must be at least 13 years old to use Victress.",
        "Use Victress fairly and only share stats that are yours.",
        "Self-reported stats are labeled as such and are not verified.",
        "We may update these terms and will tell you about material changes.",
      ],
    },
  },
};
