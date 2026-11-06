// All marketing copy lives here. Rules: short headlines, plain language, no paragraph over 2 sentences.
// Never claim a feature is live until it is. Anything unbuilt says "Coming soon" or "Planned".
export const CONTACT_EMAIL = "hello@victressesports.com";

export const copy = {
  brand: {
    name: "Victress",
    // The one tagline. Do not stack other slogans under it.
    tagline: "Turn practice into progress.",
  },

  nav: {
    links: [
      { href: "/pricing", label: "Pricing" },
      { href: "/teams", label: "For teams" },
      { href: "/partnerships", label: "Partnerships" },
      { href: "/about", label: "About" },
    ],
    cta: "Get started",
    login: "Log in",
    menuOpen: "Open menu",
    menuClose: "Close menu",
  },

  // Used by the name-check input (components/marketing/ClaimInput.tsx), which the marketing pages no longer render.
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
      // One factual sentence, not a second slogan.
      sentence: "An esports player development and recruitment platform.",
      cta: "Get started",
      login: "Log in",
    },
    // The three pillars. `status` decides the chip: "live" is Available now, "soon" is Coming soon.
    pillars: [
      {
        id: "scrim",
        title: "Scrim Intelligence",
        status: "soon" as const,
        line: "Upload private scrim demo or replay files for automatic performance statistics.",
        note: "Not available yet.",
      },
      {
        id: "resume",
        title: "Player Resume",
        status: "live" as const,
        line: "A shareable player profile with self-reported stats.",
        note: "Verified scrim stats are planned, not available yet.",
      },
      {
        id: "scout",
        title: "Scout Desk",
        status: "soon" as const,
        line: "Player discovery and evaluation for teams, coaches and collegiate programs.",
        note: "Not available yet.",
      },
    ],
    statusLive: "Available now",
    statusSoon: "Coming soon",
    games: { title: "Supported games", line: "Roles and ranks match each game." },
    teams: {
      title: "Manage your roster.",
      line: "Start a team, invite players with a link and see everyone's game and rank.",
      soon: "Shared scrim review is coming soon.",
      cta: "Start your team",
    },
    // Understanding the platform, not buying a plan (the pricing page has its own FAQ).
    // Only describe what exists today; anything unbuilt says so.
    faqTitle: "Questions, answered.",
    faq: [
      {
        q: "What is Victress?",
        a: "An esports player development and recruitment platform. Today you can build a shareable player profile and manage a team roster. Scrim analysis and recruiting tools are planned.",
      },
      { q: "Which esports games does Victress support?", a: "VALORANT, Counter-Strike 2, Rocket League, League of Legends, Apex Legends and Overwatch 2." },
      {
        q: "How does Victress track player performance?",
        a: "You enter your stats and Victress keeps your history, labeled Self-reported. Automatic stats from scrim files are not available yet.",
      },
      {
        q: "Can players create competitive profiles?",
        a: "Yes. Create a profile, add your games, roles and ranks, and share one link. Search engines list it only if you turn that on.",
      },
      {
        q: "Can teams manage their players?",
        a: "Yes. Start a team, share an invite link, and see your roster's games and ranks. Shared scrim review is coming soon.",
      },
      {
        q: "How can recruiters discover players?",
        a: "Scout Desk is coming soon and is not available yet. Join the waitlist. Players can share their profile link today.",
      },
      { q: "Is Victress free to use?", a: "Yes. Rookie is free forever. Pro, Team and Scout are coming soon." },
    ],
    soonCta: "Join the waitlist",
    final: { title: "Get started.", cta: "Get started", login: "Log in" },
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
      { q: "Can my team use Victress?", a: "Yes. You can start a team and invite players on the free plan today. The paid Team plan is coming soon." },
    ],
  },

  teams: {
    title: "Manage your roster.",
    line: "One roster. One invite link.",
    cta: "Start your team",
    // `soon` items are not built yet and are shown as Coming soon.
    benefits: [
      { title: "One roster.", line: "Invite players with a link.", soon: false },
      { title: "One dashboard.", line: "See everyone's game and rank.", soon: false },
      { title: "Shared scrim review.", line: "Review scrim performance together once scrim analysis is available.", soon: true },
      { title: "Team standings.", line: "See how your team compares with others.", soon: true },
      { title: "Team portfolio.", line: "A shareable page for your team.", soon: true },
    ],
    soonBadge: "Coming soon",
  },

  about: {
    title: "What Victress is.",
    intro: "Victress is an esports player development and recruitment platform.",
    story:
      "Competitive players practice in private scrims, but that work is hard to capture and hard to show. Victress is being built to connect practice, performance, recognition and opportunity.",
    nowTitle: "Available now",
    now: [
      "A shareable player profile with your games, roles and ranks.",
      "Self-reported stats for six games, labeled Self-reported.",
      "Team rosters with invite links.",
    ],
    plannedTitle: "Planned",
    planned: [
      "Scrim Intelligence: automatic statistics from uploaded scrim demo or replay files.",
      "Verified scrim stats on the Player Resume.",
      "Scout Desk: player discovery and evaluation for teams, coaches and collegiate programs.",
    ],
    cta: "Get started",
  },

  partnerships: {
    title: "Partnerships.",
    line: "Victress is open to conversations with groups that run or develop competitive esports.",
    groups: [
      { title: "Collegiate esports programs", line: "Roster management and player development for your program." },
      { title: "Competitive teams", line: "Roster management and, once available, shared scrim review." },
      { title: "Tournament organizers", line: "Ways to connect competition results to player profiles." },
    ],
    note: "Nothing on this page is a commitment. Terms are discussed case by case.",
    cta: "Email us",
    subject: "Victress partnership",
  },

  contact: {
    title: "Contact.",
    line: "Email us and we'll reply.",
    cta: "Email us",
    subject: "Victress",
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
      { href: "/contact", label: "Contact" },
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
        "We do not use advertising cookies.",
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
