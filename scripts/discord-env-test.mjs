// Discord environment variable handling: the descriptive Vercel names are preferred, the generic names still work, and the bot token is
// never needed at runtime. No network, no secrets: every value below is a made up placeholder.
//   node scripts/discord-env-test.mjs
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { discordEnv, DISCORD_ENV_NAMES } from "../lib/discord/env.ts";

let failed = 0;
const check = (ok, name) => { console.log(`${ok ? "PASS" : "FAIL"} ${name}`); if (!ok) failed++; };

let e = discordEnv({ VICTRESS_SCRIM_DISCORD_APPLICATION_ID: "111", VICTRESS_SCRIM_DISCORD_PUBLIC_KEY: "pk", VICTRESS_SCRIM_DISCORD_BOT_TOKEN: "bt" });
check(e.applicationId === "111" && e.publicKey === "pk" && e.botToken === "bt", "the descriptive VICTRESS_SCRIM_DISCORD_* names are read");
check(e.sources.applicationId === "VICTRESS_SCRIM_DISCORD_APPLICATION_ID" && e.sources.publicKey === "VICTRESS_SCRIM_DISCORD_PUBLIC_KEY", "the source of each value is reported by name");
e = discordEnv({ DISCORD_APPLICATION_ID: "222", DISCORD_PUBLIC_KEY: "pk2", DISCORD_BOT_TOKEN: "bt2" });
check(e.applicationId === "222" && e.publicKey === "pk2" && e.botToken === "bt2", "the generic DISCORD_* names still work (backward compatible)");
e = discordEnv({ VICTRESS_SCRIM_DISCORD_APPLICATION_ID: "111", DISCORD_APPLICATION_ID: "222", DISCORD_PUBLIC_KEY: "pk2" });
check(e.applicationId === "111" && e.publicKey === "pk2", "the descriptive name wins, and each value falls back on its own");
check(e.conflicts.length === 1 && /VICTRESS_SCRIM_DISCORD_APPLICATION_ID and DISCORD_APPLICATION_ID are both set and differ/.test(e.conflicts[0]) && !/111|222/.test(e.conflicts[0]), "a disagreement between the two names is reported by name only, never by value");
e = discordEnv({ VICTRESS_SCRIM_DISCORD_PUBLIC_KEY: "  ", DISCORD_PUBLIC_KEY: "pk2" });
check(e.publicKey === "pk2", "an empty or blank descriptive variable does not hide a working fallback");
e = discordEnv({});
check(e.applicationId === undefined && e.publicKey === undefined && e.botToken === undefined && e.conflicts.length === 0, "nothing set means nothing configured (callers refuse safely)");
check(JSON.stringify(Object.keys(DISCORD_ENV_NAMES)) === JSON.stringify(["applicationId", "publicKey", "botToken", "guildId"]), "the name table covers id, key, token and test server");

// The deployed code must never read the bot token: only the registration script may.
const files = [];
const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (f === "node_modules" || f === ".next" || f === ".git") continue; const st = statSync(p); if (st.isDirectory()) walk(p); else if (/\.(ts|tsx)$/.test(f)) files.push(p); } };
for (const d of ["app", "lib", "components", "content"]) walk(d);
const readers = files.filter((f) => /botToken|BOT_TOKEN/.test(readFileSync(f, "utf8"))).filter((f) => f !== "lib/discord/env.ts");
check(readers.length === 0, "no application, library or component code reads the bot token (it is for the local registration script only)");
const reg = readFileSync("scripts/discord-register.mjs", "utf8");
check(/botToken/.test(reg) && /VICTRESS_SCRIM_DISCORD_BOT_TOKEN/.test(reg) && !/console\.(log|error|warn)\([^)]*\btoken\b[^)]*\)/.test(reg.replace(/Set VICTRESS_SCRIM_DISCORD_BOT_TOKEN[^"]*/g, "")), "the registration script reads the token from the environment and never prints it");
const route = readFileSync("app/api/discord/interactions/route.ts", "utf8");
check(/discordEnv\(\)/.test(route) && !/process\.env\.DISCORD_/.test(route) && !/BOT_TOKEN|botToken/.test(route), "the endpoint resolves its settings through discordEnv and never touches the bot token");
const example = readFileSync(".env.example", "utf8");
check(/^VICTRESS_SCRIM_DISCORD_APPLICATION_ID=$/m.test(example) && /^VICTRESS_SCRIM_DISCORD_PUBLIC_KEY=$/m.test(example) && /^VICTRESS_SCRIM_DISCORD_BOT_TOKEN=$/m.test(example) && /^BALLCHASING_API_TOKEN=$/m.test(example), ".env.example lists the descriptive names and Ballchasing token with empty values");
check(!/^(VICTRESS_SCRIM_DISCORD_\w+|DISCORD_\w+|BALLCHASING_API_TOKEN|RIOT_API_KEY)=\S+/m.test(example), ".env.example contains no values");

console.log(failed ? `\n${failed} FAILED` : "\nAll Discord environment checks passed.");
process.exit(failed ? 1 : 0);
