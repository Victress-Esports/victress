// All marketing copy lives here. Rules: headline 2 to 6 words, one supporting line of 12 words or fewer,
// no paragraph over 2 sentences. Never claim a feature is live until it is.
export const copy = {
  brand: { name: "Victress", tagline: "Perform. Compete. Rise." },

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
      title: "Turn performance into progress.",
      line: "Your profile. Your stats. Your rank.",
    },
    steps: [
      { n: "1", title: "Claim your name." },
      { n: "2", title: "Add your game." },
      { n: "3", title: "Climb." },
    ],
    features: [
      {
        id: "profile",
        title: "One link. Your whole story.",
        line: "A player profile you can share anywhere.",
      },
      {
        id: "progress",
        title: "See what's working.",
        line: "Track your stats and watch yourself improve.",
      },
      {
        id: "leaderboard",
        title: "Know where you stand.",
        line: "Compare with your club and your community.",
      },
    ],
    teams: {
      title: "Run your club like a pro team.",
      line: "One dashboard for every player.",
      cta: "Start your team",
    },
    soon: {
      eyebrow: "Coming soon",
      items: [
        { interest: "scrims" as const, title: "Scrim analytics", line: "See how your practice turns into results." },
        { interest: "scout" as const, title: "Scout Desk", line: "Get found by clubs and programs." },
      ],
      cta: "Join the waitlist",
    },
    final: { title: "Perform. Compete. Rise." },
    sampleNote: "Sample data shown for illustration.",
  },

  pricing: {
    title: "Simple pricing.",
    line: "Start free. Upgrade when you're ready.",
    monthly: "Monthly",
    annual: "Annual",
    save: "Save with annual",
    liveCta: "Start free",
    soonCta: "Join the waitlist",
    soonBadge: "Coming soon",
    faqTitle: "Questions",
    faq: [
      {
        q: "Is Victress free?",
        a: "Yes. Rookie is free forever, with a shareable profile and manual stats.",
      },
      {
        q: "Which games do you support?",
        a: "We're starting with one game for our first players. More will follow.",
      },
      {
        q: "Where do my stats come from?",
        a: "You enter them yourself, and we label them that way. Automatic imports are coming later.",
      },
      {
        q: "When do paid plans start?",
        a: "Not yet. Join the waitlist and we'll email you once they open.",
      },
      {
        q: "Can my club join for free?",
        a: "Founding clubs get free access for their first season. Start a team to get going.",
      },
    ],
  },

  teams: {
    title: "Run your club like a pro team.",
    line: "One place for every player and every stat.",
    cta: "Start your team",
    benefits: [
      { title: "One roster.", line: "Everyone in one place, in one tap." },
      { title: "Shared standings.", line: "See how your players stack up." },
      { title: "A team portfolio.", line: "Show what your club has built." },
    ],
    note: "Founding clubs get free access for their first season.",
  },

  about: {
    title: "Why Victress exists.",
    body: [
      "Players put in the work but have nowhere to show it.",
      "Victress turns your results into a profile you own and a rank you can see.",
      "We start small, build in the open, and only promise what's live.",
    ],
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
    line: "Perform. Compete. Rise.",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
    rights: "Victress LLC. All rights reserved.",
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
        "Use Victress fairly and only share stats that are yours.",
        "Self-reported stats are labeled as such and are not verified.",
        "We may update these terms and will tell you about material changes.",
      ],
    },
  },
};
