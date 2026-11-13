// Slash command definitions. Pure data, shared by the registration script and the tests.
// Only commands that actually work are listed here. Add a command in the same change that implements it.
// /link, /unlink, /profile and /scrim need a linked Victress account (lib/discord/commands-run.ts); /help and /privacy do not.
// integration_types [0] = installed to a server (guild install). contexts [0] = usable inside a server only. No DMs.
export const COMMANDS = [
  {
    name: "help",
    type: 1,
    description: "What Victress Scrim Intelligence can do and where to start.",
    integration_types: [0],
    contexts: [0],
  },
  {
    name: "privacy",
    type: 1,
    description: "How Victress handles your information, with a link to the full policy.",
    integration_types: [0],
    contexts: [0],
  },
  {
    name: "link",
    type: 1,
    description: "Link this Discord account to your Victress account.",
    integration_types: [0],
    contexts: [0],
  },
  {
    name: "unlink",
    type: 1,
    description: "Remove the link between this Discord account and your Victress account.",
    integration_types: [0],
    contexts: [0],
  },
  {
    name: "profile",
    type: 1,
    description: "See your own linked Victress profile. Only you can see the reply.",
    integration_types: [0],
    contexts: [0],
  },
  {
    name: "scrim",
    type: 1,
    description: "Submit Rocket League replays and see your own numbers.",
    integration_types: [0],
    contexts: [0],
    options: [
      {
        type: 1,
        name: "submit",
        description: "Submit a Ballchasing replay link.",
        options: [
          { type: 3, name: "link", description: "The Ballchasing replay link. It must be unlisted or public.", required: true, max_length: 300 },
          { type: 5, name: "authorized", description: "I played in this replay or I am allowed to submit it.", required: true },
          { type: 5, name: "consent", description: "I agree Victress reads this replay and saves my own numbers, privately.", required: true },
          { type: 5, name: "team", description: "Also add the result and side totals to my team's scrims. Off unless you choose True.", required: false },
          { type: 3, name: "opponent", description: "Optional label for the opponent, seen only by your team. Leave out real player names.", required: false, max_length: 40 },
        ],
      },
      { type: 1, name: "status", description: "See what happened to your latest submissions." },
      {
        type: 1,
        name: "stats",
        description: "See your own Rocket League numbers.",
        options: [
          {
            type: 3, name: "kind", description: "Which games to include.", required: false,
            choices: [{ name: "All", value: "all" }, { name: "Private matches", value: "custom" }, { name: "Ranked", value: "ranked" }, { name: "Casual", value: "normal" }],
          },
        ],
      },
    ],
  },
] as const;
