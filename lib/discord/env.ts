// Which environment variables the Discord integration reads. No imports and no server only guard, so the route, the registration script
// and the tests all use the same rules.
//
// Preferred names (the ones set in Vercel): VICTRESS_SCRIM_DISCORD_APPLICATION_ID, VICTRESS_SCRIM_DISCORD_PUBLIC_KEY,
// VICTRESS_SCRIM_DISCORD_BOT_TOKEN. The generic names DISCORD_APPLICATION_ID, DISCORD_PUBLIC_KEY and DISCORD_BOT_TOKEN still work as a
// fallback. When both exist the descriptive name wins.
//
// What each one is for:
//   application id  runtime: the endpoint refuses interactions meant for another application. Public value.
//   public key      runtime: verifies Discord's signature on every request. Public value (it is not the bot token).
//   bot token       NEVER needed at runtime and never read by the deployed app. Only the local command registration script uses it.
type Env = Record<string, string | undefined>;

export const DISCORD_ENV_NAMES = {
  applicationId: ["VICTRESS_SCRIM_DISCORD_APPLICATION_ID", "DISCORD_APPLICATION_ID"],
  publicKey: ["VICTRESS_SCRIM_DISCORD_PUBLIC_KEY", "DISCORD_PUBLIC_KEY"],
  botToken: ["VICTRESS_SCRIM_DISCORD_BOT_TOKEN", "DISCORD_BOT_TOKEN"],
  guildId: ["VICTRESS_SCRIM_DISCORD_DEV_GUILD_ID", "DISCORD_DEV_GUILD_ID"],
} as const;

const clean = (v: string | undefined) => (v ?? "").trim() || undefined;
function pick(env: Env, names: readonly string[]): { value?: string; name?: string } {
  for (const n of names) { const v = clean(env[n]); if (v) return { value: v, name: n }; }
  return {};
}

export function discordEnv(env: Env = process.env) {
  const applicationId = pick(env, DISCORD_ENV_NAMES.applicationId);
  const publicKey = pick(env, DISCORD_ENV_NAMES.publicKey);
  const botToken = pick(env, DISCORD_ENV_NAMES.botToken);
  const guildId = pick(env, DISCORD_ENV_NAMES.guildId);
  // Names only, never values: say when a preferred and a fallback name both exist but disagree, so a stale value is noticed.
  const conflicts = (Object.entries(DISCORD_ENV_NAMES) as [string, readonly string[]][])
    .filter(([, names]) => { const set = names.map((n) => clean(env[n])).filter(Boolean); return set.length > 1 && new Set(set).size > 1; })
    .map(([k, names]) => `${names[0]} and ${names[1]} are both set and differ; ${names[0]} is used`);
  return {
    applicationId: applicationId.value, publicKey: publicKey.value, botToken: botToken.value, guildId: guildId.value,
    /** Which variable each value came from (names only). */
    sources: { applicationId: applicationId.name, publicKey: publicKey.name, botToken: botToken.name, guildId: guildId.name },
    conflicts,
  };
}
