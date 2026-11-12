// Decides how to answer a verified Discord interaction. Pure: no network, no database, no secrets, so it is easy to test.
// Phase 1 answers only /help and /privacy. Commands that need a Victress account or data (/link, /scrim and the rest) are not
// registered and not handled yet: anything unknown gets a plain "not available" reply instead of pretending to work.
import type { Interaction, InteractionResponse, MessageData, Outcome } from "./types";

const PRIVACY_URL = "https://victressesports.com/privacy";
const TERMS_URL = "https://victressesports.com/terms";
const APP_URL = "https://victress.gg";
const NO_MENTIONS = { parse: [] as string[] };

/** Only the user who ran the command sees the reply, and nothing in it can ping anyone. */
const ephemeral = (content: string): MessageData => ({ content, flags: 64, allowed_mentions: NO_MENTIONS });
const reply = (content: string): Outcome => ({ kind: "respond", body: { type: 4, data: ephemeral(content) } });

export const HELP_TEXT = [
  "**Victress Scrim Intelligence**",
  `This is the Discord interface to Victress (${APP_URL}). It answers slash commands only.`,
  "",
  "Available now: `/help` and `/privacy`.",
  "Coming soon: linking your Victress account, and submitting and checking scrims.",
  "",
  `Terms: ${TERMS_URL}`,
  `Privacy: ${PRIVACY_URL}`,
].join("\n");

// Keep this text true. It describes Phase 1, where nothing from a command is saved. Update it in the same change that starts
// saving anything (account linking, scrim submissions), and keep it consistent with the published Privacy page.
export const PRIVACY_TEXT = [
  "**Privacy**",
  "Victress Scrim Intelligence responds to slash commands. It does not read ordinary messages in your server.",
  "Right now it does not save anything from your commands to a Victress account or database.",
  "",
  `Full policy: ${PRIVACY_URL}`,
  "Questions or deletion requests: privacy@victressesports.com",
].join("\n");

export function handleInteraction(i: Interaction, opts: { applicationId?: string } = {}): Outcome {
  if (i.type === 1) return { kind: "respond", body: { type: 1 } satisfies InteractionResponse };

  // Defense in depth: an interaction meant for a different application is never answered.
  if (opts.applicationId && i.application_id && i.application_id !== opts.applicationId) {
    return reply("This request was not meant for Victress Scrim Intelligence.");
  }

  if (i.type === 2) {
    switch (i.data?.name) {
      case "help":
        return reply(HELP_TEXT);
      case "privacy":
        return reply(PRIVACY_TEXT);
      default:
        return reply("That command is not available yet. Try `/help`.");
    }
  }
  return reply("That interaction is not supported. Try `/help`.");
}

/** Logging helper: a fixed allowlist of non sensitive fields. Never pass tokens, user ids, guild ids or message text. */
export function logLine(event: string, fields: Record<string, string | number | boolean | undefined> = {}) {
  console.log(JSON.stringify({ src: "discord", event, ...fields }));
}
