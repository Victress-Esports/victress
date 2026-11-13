// Registers the slash commands with Discord. Run on your own machine, never in CI or on Vercel.
//   node scripts/discord-register.mjs --dry-run            prints what would be sent, contacts nothing
//   node scripts/discord-register.mjs                      registers to the test server DISCORD_DEV_GUILD_ID (instant)
//   node scripts/discord-register.mjs --global             registers everywhere the app is installed (can take up to an hour)
// Needs the application id and the bot token in the environment: VICTRESS_SCRIM_DISCORD_APPLICATION_ID and VICTRESS_SCRIM_DISCORD_BOT_TOKEN
// (the generic DISCORD_APPLICATION_ID and DISCORD_BOT_TOKEN also work). The bot token is needed ONLY here, never by the deployed app. The token is read from the environment only and is
// never printed. This replaces the app's full command list (bulk overwrite), so the list in lib/discord/commands.ts is exact.
import { COMMANDS } from "../lib/discord/commands.ts";
import { discordEnv } from "../lib/discord/env.ts";

const args = new Set(process.argv.slice(2));
const dry = args.has("--dry-run");
const global = args.has("--global");
const cfg = discordEnv();
const appId = cfg.applicationId;
const token = cfg.botToken;
const guild = cfg.guildId;

if (!/^\d{15,25}$/.test(appId ?? "")) {
  console.error("Set VICTRESS_SCRIM_DISCORD_APPLICATION_ID (the numeric Application ID).");
  process.exit(1);
}
if (!global && !/^\d{15,25}$/.test(guild ?? "")) {
  console.error("Set DISCORD_DEV_GUILD_ID to your private test server's ID, or pass --global on purpose.");
  process.exit(1);
}
const url = global
  ? `https://discord.com/api/v10/applications/${appId}/commands`
  : `https://discord.com/api/v10/applications/${appId}/guilds/${guild}/commands`;

for (const c of cfg.conflicts) console.warn(`Note: ${c}.`);
console.log(`${dry ? "Dry run: " : ""}${COMMANDS.length} command(s) -> ${global ? "GLOBAL" : "test server " + guild}`);
for (const c of COMMANDS) console.log(`  /${c.name}: ${c.description}`);
if (dry) process.exit(0);

if (!token) {
  console.error("Set VICTRESS_SCRIM_DISCORD_BOT_TOKEN in your environment (not on the command line, not in a file you commit).");
  process.exit(1);
}
const res = await fetch(url, {
  method: "PUT",
  headers: { authorization: `Bot ${token}`, "content-type": "application/json" },
  body: JSON.stringify(COMMANDS),
});
if (!res.ok) {
  // Print Discord's error message only; it does not echo the token.
  let msg = "";
  try { msg = (await res.json()).message ?? ""; } catch {}
  console.error(`Discord refused the request: HTTP ${res.status} ${msg}`);
  process.exit(1);
}
const done = await res.json();
console.log(`Registered ${done.length} command(s): ${done.map((c) => "/" + c.name).join(", ")}`);
