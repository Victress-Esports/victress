// All marketing copy lives here. Rules: short headlines, plain language, no paragraph over 2 sentences.
// Present tense, plain words. Never describe an unbuilt feature as available: where a page must mention one, it carries one plain "Coming soon" label next to it.
// No status language anywhere (in development, being built, beta, early, pilot stage, planned) and nothing about stats players enter themselves.
export const CONTACT_EMAIL = "hello@victressesports.com";

export const copy = {
  brand: {
    name: "Victress",
    // The one tagline. Do not stack other slogans under it.
    tagline: "Turn practice into progress.",
  },

  nav: {
    links: [
      { href: "/platform", label: "Platform" },
      { href: "/women-in-esports", label: "Women in Esports" },
      { href: "/pricing", label: "Pricing" },
    ],
    // Also listed in the phone menu (and, with the footer links, at the bottom of every page).
    more: [
      { href: "/design-partner", label: "Design Partner" },
      { href: "/teams", label: "For teams" },
      { href: "/about", label: "About" },
      { href: "/partnerships", label: "Partnerships" },
      { href: "/contact", label: "Contact" },
    ],
    cta: "Sign up",
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
    // Above the fold: the headline (the tagline, used once), one sentence, ONE button, one small line, one labeled sample.
    hero: {
      title: "Turn practice into progress.",
      sentence:
        "Victress is where competitive esports players build a Player Resume and teams manage their rosters.",
      primary: "Become a Design Partner",
      note: "Free 4 to 6 week pilot for one competitive team.",
    },
    // 1. The three products, one line each. A product that is not built carries one plain "Coming soon" label.
    productsTitle: "Three products.",
    // `soon` puts one plain "Coming soon" label next to the product; nothing else about status.
    pillars: [
      {
        id: "scrim",
        title: "Scrim Intelligence",
        soon: true,
        line: "Turn private practice into performance information.",
      },
      {
        id: "resume",
        title: "Player Resume",
        soon: false,
        line: "Your games, roles, ranks, tournaments and highlights in one resume you control.",
      },
      {
        id: "scout",
        title: "Scout Desk",
        soon: true,
        line: "Structured discovery and evaluation for teams, coaches and collegiate programs.",
      },
    ],
    soonLabel: "Coming soon",
    learnMore: "Learn more",
    // 2. How it works, three short steps (each one is something a player can do on Victress).
    howTitle: "How it works.",
    steps: [
      { title: "Create your account", line: "Add your games, roles and ranks." },
      { title: "Build your Player Resume", line: "Add your tournaments and highlights." },
      { title: "Start a team", line: "Invite players with a link." },
    ],
    // 3. The design partner pilot (terms are in designPartner below). 4. One closing button.
    pilotTitle: "The design partner pilot.",
    closing: { cta: "Become a Design Partner" },
    final: { title: "Get started.", cta: "Get started", login: "Log in" },
    sharedValueLink: "About Women in Esports",
  },

  // Women in Esports (never "Victress Women in Esports"): an intentional shared value commitment, not a limit on who Victress serves (docs/strategy/victress-business-purpose.md).
  // It is delivered through the same three pillars, not a separate product, program, company or fourth pillar.
  // Every line must stay true today and never imply a live program or offer.
  // Do not create another initiative name.
  womenInEsports: {
    title: "Women in Esports",
    line: "Victress is called Victress for a purpose.",
    message:
      "Women who compete face extra barriers to being seen, developing and getting opportunities. We address them through the same infrastructure we build for every player.",
    areas: [
      {
        title: "Visibility",
        line: "A credible record of competitive identity, experience and achievements that players control.",
        pillar: "resume" as const,
      },
      {
        title: "Development",
        line: "Meaningful performance feedback from private practice, so progress can be measured and shown.",
        pillar: "scrim" as const,
      },
      {
        title: "Opportunity",
        line: "Structured, evidence based discovery by teams, coaches, collegiate programs and recruiters.",
        pillar: "scout" as const,
      },
    ],
    connectedTo: "Delivered through",
    note: "Victress is not currently offering funding, coaching, mentorship, scholarships or recruitment.",
    more: "Read about Women in Esports",
    cta: "Get in touch",
    subject: "Women in Esports",
  },

  // /platform: how the three products fit together. Statuses come from home.pillars and must stay true.
  platform: {
    title: "The Victress platform.",
    line: "Three connected products take a player from practice to opportunity.",
    pathwayTitle: "From practice to opportunity.",
    steps: [
      {
        title: "Practice",
        line: "Private scrims and team training.",
        product: "The work players already do",
      },
      {
        title: "Performance Evidence",
        line: "What happened, clearly sourced.",
        product: "Scrim Intelligence",
      },
      {
        title: "Development",
        line: "Strengths and trends, understood.",
        product: "Scrim Intelligence and Player Resume",
      },
      {
        title: "Recognition",
        line: "A credible record of what a player can do.",
        product: "Player Resume",
      },
      {
        title: "Opportunity",
        line: "Connections with teams, coaches, collegiate programs and recruiters.",
        product: "Scout Desk",
      },
    ],
    // What each live product does. Unbuilt products show the home.pillars line and one "Coming soon" label, nothing more.
    products: {
      scrim: { points: [] as string[] },
      resume: {
        points: [
          "Your games, roles and ranks in one place.",
          "Tournament history and highlights.",
          "Privacy controls: your profile is private by default.",
        ],
      },
      scout: { points: [] as string[] },
    },
    cta: "Become a Design Partner",
  },

  // /women-in-esports. Principles in present tense; no claim of a live program, offer or feature that does not exist.
  womenPage: {
    title: "Women in Esports.",
    whyTitle: "Why this matters.",
    why: [
      "Women who compete in esports face barriers that include harassment, limited access to competitive networks, informal gatekeeping and difficulty getting their achievements recognized.",
      "Victress is built to improve how competitive talent is documented, developed, evaluated and connected to opportunity. This initiative applies that work to those barriers. It is not a separate product. It uses the same three Victress products.",
    ],
    areasTitle: "Three areas, three products.",
    commitmentsTitle: "How we approach it.",
    commitments: [
      {
        title: "Data integrity",
        line: "Evidence shows its source. Verification means the evidence is intact, not that a player is good or bad.",
      },
      {
        title: "Contextual evaluation",
        line: "Performance is shown in context, such as role and team, so numbers inform decisions instead of replacing them.",
      },
      {
        title: "Privacy controls",
        line: "Players decide who sees their profile and when. Contact details are shared only with the player's consent.",
      },
      {
        title: "Safety",
        line: "Reporting, blocking and review are in place before features that expose players to strangers launch.",
      },
    ],
    pilotTitle: "A first step.",
    pilot:
      "The Founding Design Partner pilot is a 4 to 6 week program open to women's competitive rosters, Game Changers teams and collegiate programs.",
    pilotCta: "See the pilot",
    contactCta: "Contact us",
  },

  // /design-partner. The program terms below are the founder's, used as given.
  designPartner: {
    title: "Founding Design Partner pilot.",
    line: "A 4 to 6 week pilot for teams that help shape Victress.",
    status: "Applying does not guarantee a place.",
    receiveTitle: "What partners receive",
    receive: [
      "Free, priority access to Player Resume and Scrim Intelligence (Coming soon) during the 4 to 6 week pilot.",
      "Structured performance analytics (Coming soon).",
      "Direct input into product development.",
    ],
    expectedTitle: "What we ask",
    expected: [
      "Regular scrim or practice file uploads.",
      "A weekly 15 minute feedback check in with the team coach or captain.",
      "Willingness to take part in a mutually approved case study on the findings. Nothing is published without written sign off from both Victress and the partner team.",
    ],
    forTitle: "Who it is for",
    for: [
      "Active women's competitive esports rosters.",
      "Game Changers teams.",
      "Collegiate programs running regular practice schedules.",
    ],
    applyTitle: "Apply",
  },

  // /contact: two paths. Both forms email hello@victressesports.com.
  contactPage: {
    title: "Contact.",
    line: "Choose the option that fits.",
    orgTitle: "Teams and organizations",
    orgLine: "Apply for the Founding Design Partner pilot.",
    orgSubmit: "Apply for Design Partner",
    playerTitle: "Individual players",
    playerLine: "Request access as a player. We will email you.",
    playerSubmit: "Request access",
    emailLine: "Prefer email? Write to",
  },

  forms: {
    name: "Your name",
    email: "Email address",
    organization: "Team or organization",
    role: "Your role",
    roles: ["Coach", "Captain", "Manager", "Other"],
    teamType: "What best describes you?",
    teamTypes: [
      "Women's competitive esports roster",
      "Game Changers team",
      "Collegiate program",
      "Other",
    ],
    game: "Main game",
    games: "Other",
    message: "Anything else we should know (optional)",
    notice: "We use these details to reply to you.",
    privacy: "Privacy Policy",
    sending: "Sending…",
    done: "Thank you. We have your message and will reply by email.",
    error:
      "Something went wrong. Try again, or email hello@victressesports.com.",
    invalid: "Check the highlighted details and try again.",
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
      {
        q: "Which games can I add?",
        a: "VALORANT, CS2, Rocket League, League of Legends, Apex Legends and Overwatch 2.",
      },
      {
        q: "Can my team use Victress?",
        a: "Yes. You can start a team and invite players on the free plan.",
      },
    ],
  },

  teams: {
    title: "Manage your roster.",
    line: "One roster. One invite link.",
    cta: "Start your team",
    // `soon` items are not built yet and are shown as Coming soon.
    benefits: [
      {
        title: "One roster.",
        line: "Invite players with a link.",
        soon: false,
      },
      {
        title: "One dashboard.",
        line: "See everyone's game and rank.",
        soon: false,
      },
      {
        title: "Shared scrim review.",
        line: "Review scrim performance together.",
        soon: true,
      },
      {
        title: "Team standings.",
        line: "See how your team compares with others.",
        soon: true,
      },
      {
        title: "Team portfolio.",
        line: "A shareable page for your team.",
        soon: true,
      },
    ],
    soonBadge: "Coming soon",
  },

  // About page. Source: docs/proposals/about-page-draft.md (approved for publishing 2026-11-06), based on the strategy document.
  // Held back until true: privacy control, safety reporting, verified data, outcomes or partnerships.
  about: {
    title: "Why Victress exists.",
    intro:
      "Competitive esports has enormous talent and ambition, but the road from practice to opportunity is fragmented. Players practice without always getting useful feedback. Their achievements are scattered across platforms and screenshots. Teams and recruiters often rely on informal networks to find talent.",
    story:
      "Victress provides infrastructure for competitive development that is measurable, talent that is easy to see, evaluation that is transparent, and opportunities that are accessible.",
    pathTitle: "From practice to opportunity.",
    path: [
      { title: "Practice", line: "Private scrims and team training." },
      { title: "Performance evidence", line: "What actually happened, clearly sourced." },
      { title: "Development", line: "Understanding strengths and trends." },
      { title: "Recognition", line: "A credible record of what a player can do." },
      { title: "Opportunity", line: "Connections with teams, coaches, collegiate programs and recruiters." },
    ],
    pillarsTitle: "Three connected capabilities.",
    womenTitle: "Women in Esports.",
    women: [
      "Victress is called Victress for a purpose. Women who compete in esports face barriers that include harassment, limited access to competitive networks, informal gatekeeping and difficulty getting their achievements recognized.",
      "We are not building a separate product for this. We are building the same infrastructure for everyone, and designing it to address those barriers: a Player Resume for visibility, Scrim Intelligence for development, and Scout Desk for opportunity.",
      "Victress is not currently offering funding, coaching, mentorship, scholarships or recruitment.",
    ],
    valueTitle: "Good for players. Good for the business.",
    value:
      "Victress is a technology business built on Creating Shared Value. The products that help players develop, get seen and find opportunities are the same products teams and recruiters pay for. We succeed commercially by making the competitive ecosystem work better.",
    nowTitle: "What Victress does",
    // `soon` puts one plain "Coming soon" label next to the item.
    offers: [
      { text: "Player accounts with your games, roles and ranks.", soon: false },
      { text: "Team rosters with invite links.", soon: false },
      { text: "A profile that is private by default, so you choose what to share.", soon: false },
      { text: "Scrim Intelligence: private practice into performance information.", soon: true },
      { text: "Scout Desk: discovery and evaluation for teams, coaches and collegiate programs.", soon: true },
    ],
    cta: "Get started",
  },

  partnerships: {
    title: "Partnerships.",
    line: "Victress is open to conversations with groups that run or develop competitive esports.",
    groups: [
      {
        title: "Collegiate esports programs",
        line: "Roster management and player development for your program.",
      },
      {
        title: "Competitive teams",
        line: "Roster management and shared scrim review.",
      },
      {
        title: "Tournament organizers",
        line: "Ways to connect competition results to player profiles.",
      },
    ],
    note: "Nothing on this page is a commitment. Terms are discussed case by case.",
    cta: "Email us",
    subject: "Victress partnership",
  },

  waitlist: {
    title: "Join the waitlist.",
    line: "We'll email you once.",
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
      { href: "/teams", label: "For teams" },
      { href: "/about", label: "About" },
      { href: "/partnerships", label: "Partnerships" },
      { href: "/contact", label: "Contact" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
    rights: "Victress LLC. All rights reserved.",
    trademarks:
      "Game names are trademarks of their owners. Victress is not affiliated with or endorsed by them.",
  },

  auth: {
    // Shown under the sign-in options, which is also how people sign up.
    ageNotice:
      "You must be 13 or older to use Victress. By continuing you agree to the",
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
        "Use Victress fairly and only share information that is yours.",
        "We may update these terms and will tell you about material changes.",
      ],
    },
  },
};
