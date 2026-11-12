// Slash command definitions. Pure data, shared by the registration script and the tests.
// Only commands that actually work are listed here. Add a command in the same change that implements it.
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
] as const;
