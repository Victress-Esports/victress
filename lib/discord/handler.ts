// Decides how to answer a verified Discord interaction. Pure: no network, no database, no secrets, so it is easy to test.
// Answers /help and /privacy. Commands that need a Victress account or data (/link, /unlink, /profile, /scrim) are handled by the route
// through lib/discord/commands-run.ts; anything unknown gets a plain "not available" reply instead of pretending to work.
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
  "`/link` and `/unlink`: connect or disconnect this Discord account and your Victress account.",
  "`/profile`: see your own linked profile.",
  "`/scrim submit`, `/scrim status`, `/scrim stats`: submit a Ballchasing replay link for Rocket League and see your own numbers. Set `team` to True to also add the scrim to your team's list.",
  "`/privacy`: what is saved, and the full policy.",
  "",
  "Scrim commands are open to approved pilot players with a linked account. Other games are coming soon.",
  `Terms: ${TERMS_URL}`,
  `Privacy: ${PRIVACY_URL}`,
].join("\n");

// Keep this text true and consistent with the published Privacy page. Update it in the same change as anything new that is saved.
export const PRIVACY_TEXT = [
  "**Privacy**",
  "Victress Scrim Intelligence responds to slash commands. It does not read ordinary messages in your server.",
  "When you link, Victress saves your Discord user ID with your Victress account. `/unlink` removes it.",
  "When you submit a Ballchasing replay, Victress reads it from Ballchasing and saves your own numbers from it, privately to your account. Other players in the replay are not named.",
  "Only if you set `team` to True, the result, score and side totals are added to your team's scrims, which your current roster can see. Opponents are kept as totals, with no names or IDs. A teammate's individual numbers appear only if that teammate chose to share them on Victress.",
  "Linking alone does not make your profile or numbers visible to anyone. You can delete saved Rocket League data in your dashboard.",
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
