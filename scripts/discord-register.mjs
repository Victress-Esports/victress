// Registers the slash commands with Discord. Run on your own machine, never in CI or on Vercel.
//   node scripts/discord-register.mjs --dry-run            prints what would be sent, contacts nothing
//   node scripts/discord-register.mjs                      registers to the test server DISCORD_DEV_GUILD_ID (instant)
//   node scripts/discord-register.mjs --global             registers everywhere the app is installed (can take up to an hour)
// Needs DISCORD_APPLICATION_ID and DISCORD_BOT_TOKEN in the environment. The token is read from the environment only and is
// never printed. This replaces the app's full command list (bulk overwrite), so the list in lib/discord/commands.ts is exact.
import { COMMANDS } from "../lib/discord/commands.ts";

const args = new Set(process.argv.slice(2));
const dry = args.has("--dry-run");
const global = args.has("--global");
const appId = process.env.DISCORD_APPLICATION_ID;
const token = process.env.DISCORD_BOT_TOKEN;
const guild = process.env.DISCORD_DEV_GUILD_ID;

if (!/^\d{15,25}$/.test(appId ?? "")) {
  console.error("Set DISCORD_APPLICATION_ID (the numeric Application ID).");
  process.exit(1);
}
if (!global && !/^\d{15,25}$/.test(guild ?? "")) {
  console.error("Set DISCORD_DEV_GUILD_ID to your private test server's ID, or pass --global on purpose.");
  process.exit(1);
}
const url = global
  ? `https://discord.com/api/v10/applications/${appId}/commands`
  : `https://discord.com/api/v10/applications/${appId}/guilds/${guild}/commands`;

console.log(`${dry ? "Dry run: " : ""}${COMMANDS.length} command(s) -> ${global ? "GLOBAL" : "test server " + guild}`);
for (const c of COMMANDS) console.log(`  /${c.name}: ${c.description}`);
if (dry) process.exit(0);

if (!token) {
  console.error("Set DISCORD_BOT_TOKEN in your environment (not on the command line, not in a file you commit).");
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
