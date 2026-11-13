// The Discord commands that need Victress data: /link, /unlink, /profile and /scrim. Dependencies are injected so this module has no
// imports of its own (other than types) and is tested with stubs. It never returns another player's information: every reply is about the
// Discord user who ran the command, is visible only to them, and cannot ping anyone.
import type { Interaction, MessageData } from "./types";

export const DB_COMMANDS = new Set(["link", "unlink", "profile", "scrim"]);
const NO_MENTIONS = { parse: [] as string[] };
const reply = (content: string): MessageData => ({ content: content.slice(0, 1900), flags: 64, allowed_mentions: NO_MENTIONS });

export type Services = {
  admin: any;
  appUrl: string;
  /** SCRIM_UPLOADS_ENABLED: the pilot flag. */
  pilotOpen: boolean;
  /** The same gate the website applies: age confirmed and the CURRENT Terms and Privacy accepted. Fail closed. */
  consentOk: (profileId: string) => Promise<boolean>;
  newCode: () => string;
  hashCode: (code: string) => string;
  linkUrl: (appUrl: string, code: string) => string;
  /** Closes submissions that were abandoned (their function was stopped) so they never show as processing forever. */
  sweepStale: (userId: string) => Promise<void>;
  importReplay: (userId: string, link: string, o: { authorized: boolean; consent: boolean; via: "discord" }) => Promise<{ ok: boolean; message: string }>;
  summarize: (rows: unknown[], kind: string) => null | {
    games: number; wins: number; losses: number; winRate: number | null; smallSample: boolean;
    perGame: { score: number; goals: number; assists: number; saves: number; shots: number; demosInflicted: number; demosTaken: number };
    shootingPercent: number | null; boostPerMinute: number | null; averageSpeed: number | null; supersonicPercent: number | null;
    team: null | { games: number; teamGoalsFor: number; teamGoalsAgainst: number; teamShotsFor: number; teamShotsAgainst: number; yourShareOfTeamGoals: number | null; yourShareOfTeamShots: number | null };
  };
};

const PLATFORM = { steam: "Steam", epic: "Epic Games", xbox: "Xbox", ps4: "PlayStation (numeric ID)", psynet: "PlayStation Network", switch: "Nintendo Switch" } as Record<string, string>;
const masked = (id: string) => (id.length <= 6 ? id : `${id.slice(0, 3)}…${id.slice(-3)}`);
const one = (n: number | null) => (n === null ? "n/a" : n.toFixed(1));

export async function runDeferred(i: Interaction, s: Services): Promise<MessageData> {
  const user = i.member?.user ?? i.user;
  if (!user?.id || !/^[0-9]{15,25}$/.test(user.id)) return reply("I could not tell which Discord account ran this command.");
  const name = i.data?.name;
  const top = i.data?.options ?? [];
  try {
    if (name === "link") return await link(user, s);
    if (name === "unlink") return await unlink(user.id, s);
    if (name === "profile") return await profile(user.id, s);
    if (name === "scrim") {
      const sub = top[0];
      const opts = new Map((sub?.options ?? []).map((o) => [o.name, o.value]));
      if (sub?.name === "submit") return await submit(user.id, opts, s);
      if (sub?.name === "status") return await status(user.id, s);
      if (sub?.name === "stats") return await stats(user.id, opts, s);
    }
    return reply("That command is not available. Try `/help`.");
  } catch {
    return reply("Something went wrong. Try again in a moment.");
  }
}

async function linkedProfile(discordId: string, s: Services): Promise<string | null> {
  const { data } = await s.admin.from("discord_links").select("profile_id").eq("discord_user_id", discordId).maybeSingle();
  return data?.profile_id ?? null;
}

async function link(user: { id: string; username?: string; global_name?: string | null }, s: Services) {
  if (await linkedProfile(user.id, s)) return reply("This Discord account is already linked to a Victress account. Use `/profile` to see it, or `/unlink` to remove the link.");
  const code = s.newCode();
  const hint = [user.global_name, user.username && `@${user.username}`].filter(Boolean).join(" ").slice(0, 80) || null;
  const { data, error } = await s.admin.rpc("discord_create_link_code", { p_discord_user_id: user.id, p_code_hash: s.hashCode(code), p_hint: hint });
  if (error) return reply("Linking is not available right now. Try again later.");
  if (data === "rate_limited") return reply("You asked for several link codes recently. Try again in an hour.");
  if (data === "already_linked") return reply("This Discord account is already linked to a Victress account.");
  if (data !== "ok") return reply("Linking is not available right now. Try again later.");
  return reply([
    "**Link your Victress account**",
    `Open this link while you are signed in to Victress to finish: <${s.linkUrl(s.appUrl, code)}>`,
    "It works once and expires in 10 minutes. Only open it if you just ran `/link` yourself. Never share it.",
    "Linking only connects this Discord account to your Victress account. It does not share your profile or any numbers with anyone.",
  ].join("\n"));
}

async function unlink(discordId: string, s: Services) {
  const { data, error } = await s.admin.rpc("discord_unlink", { p_discord_user_id: discordId });
  if (error) return reply("Unlinking is not available right now. Try again later.");
  return reply(data === true
    ? "Your Discord account is no longer linked. Your Victress account and anything already saved on it are unchanged. To delete saved Rocket League data, use the Rocket League page in your dashboard."
    : "This Discord account was not linked.");
}

async function profile(discordId: string, s: Services) {
  const pid = await linkedProfile(discordId, s);
  if (!pid) return reply("This Discord account is not linked to a Victress account. Use `/link` to link it.");
  const stop = await blocked(pid, s, false);
  if (stop) return stop;
  const [{ data: p }, { data: m }, { data: rl }, { count }] = await Promise.all([
    s.admin.from("profiles").select("handle, display_name").eq("id", pid).maybeSingle(),
    s.admin.from("team_members").select("role, team_id").eq("profile_id", pid).maybeSingle(),
    s.admin.from("game_accounts").select("platform, external_id").eq("profile_id", pid).eq("game", "ROCKET_LEAGUE").maybeSingle(),
    s.admin.from("game_matches").select("id", { count: "exact", head: true }).eq("profile_id", pid).eq("game", "ROCKET_LEAGUE"),
  ]);
  let team = "No team";
  if (m?.team_id) { const { data: t } = await s.admin.from("teams").select("name").eq("id", m.team_id).maybeSingle(); if (t?.name) team = `${t.name} (${m.role})`; }
  return reply([
    "**Your Victress profile** (only you can see this message)",
    `Account: ${p?.display_name ? `${p.display_name}, ` : ""}${p?.handle ? `victress.gg/${p.handle}` : "linked"}`,
    `Team: ${team}`,
    `Rocket League ID: ${rl ? `${PLATFORM[rl.platform] ?? rl.platform}, ${masked(rl.external_id)}` : "not added yet. On the Rocket League page in your dashboard, paste your Ballchasing player link (easiest) or choose your platform and enter your ID."}`,
    `Saved Rocket League games: ${count ?? 0}`,
    "Linking does not make your profile or numbers visible to anyone. Visibility stays in your privacy settings on Victress.",
  ].join("\n"));
}

/** The pilot gate, as on the website: the flag, and the linked player is on the allowlist. */
async function pilotOk(pid: string, s: Services) {
  if (!s.pilotOpen) return false;
  const { data } = await s.admin.from("design_partner_allowlist").select("profile_id").eq("profile_id", pid).maybeSingle();
  return !!data;
}

const NEEDS_CONSENT = "Before you can use this, open victress.gg and accept the current Terms and Privacy Policy. Then try again.";
const NOT_PILOT = "Scrim submissions are open to approved pilot players only. Your account is not on the list.";

/**
 * Everything a linked player does with their own data passes the website's rules first: consent to the current documents, then the
 * pilot gate. Returns the reply to send when the player may not continue. (/unlink is exempt: leaving is never blocked.)
 */
async function blocked(pid: string, s: Services, needsPilot: boolean): Promise<MessageData | null> {
  if (!(await s.consentOk(pid))) return reply(NEEDS_CONSENT);
  if (needsPilot && !(await pilotOk(pid, s))) return reply(NOT_PILOT);
  return null;
}

async function submit(discordId: string, opts: Map<string, unknown>, s: Services) {
  const pid = await linkedProfile(discordId, s);
  if (!pid) return reply("Link your Victress account first with `/link`.");
  const stop = await blocked(pid, s, true);
  if (stop) return stop;
  const linkText = typeof opts.get("link") === "string" ? (opts.get("link") as string) : "";
  const authorized = opts.get("authorized") === true;
  const consent = opts.get("consent") === true;
  if (!authorized || !consent) return reply("Nothing was submitted. Set both confirmations to True: that you are allowed to submit this replay, and that you agree to Victress reading it from Ballchasing and saving your own numbers.");
  const r = await s.importReplay(pid, linkText, { authorized, consent, via: "discord" });
  return reply(r.ok ? `${r.message}\nSee \`/scrim stats\`, or open ${s.appUrl.replace(/\/+$/, "")}/dashboard/scrims/rocket-league` : r.message);
}

async function status(discordId: string, s: Services) {
  const pid = await linkedProfile(discordId, s);
  if (!pid) return reply("Link your Victress account first with `/link`.");
  const stop = await blocked(pid, s, true);
  if (stop) return stop;
  await s.sweepStale(pid); // an abandoned submission is closed as failed instead of showing as processing forever
  const { data } = await s.admin.from("import_jobs").select("status, error_message, external_ref, submitted_via, created_at").eq("profile_id", pid).eq("game", "ROCKET_LEAGUE").order("created_at", { ascending: false }).limit(5);
  if (!data?.length) return reply("You have not submitted any Rocket League replays yet. Use `/scrim submit`.");
  const lines = data.map((j: { status: string; error_message: string | null; external_ref: string | null; created_at: string }) => {
    const when = new Date(j.created_at).toISOString().slice(0, 16).replace("T", " ") + " UTC";
    const state = j.status === "succeeded" ? "saved" : j.status === "failed" ? "not saved" : "still processing (give it a minute)";
    return `• ${when}: ${state}${j.status === "failed" && j.error_message ? ` (${j.error_message})` : ""}\n  ballchasing.com/replay/${j.external_ref ?? ""}`;
  });
  return reply(["**Your latest submissions** (only you can see this)", ...lines].join("\n"));
}

async function stats(discordId: string, opts: Map<string, unknown>, s: Services) {
  const pid = await linkedProfile(discordId, s);
  if (!pid) return reply("Link your Victress account first with `/link`.");
  const stop = await blocked(pid, s, true);
  if (stop) return stop;
  const kinds = ["all", "custom", "ranked", "normal"];
  const kind = kinds.includes(String(opts.get("kind"))) ? String(opts.get("kind")) : "all";
  const { data } = await s.admin.from("game_matches").select("queue_kind, played_at, duration_seconds, result, me, participants").eq("profile_id", pid).eq("game", "ROCKET_LEAGUE").order("played_at", { ascending: false }).limit(60);
  const sum = s.summarize(data ?? [], kind);
  if (!sum) return reply("No Rocket League games saved yet" + (kind === "all" ? "" : " for that match type") + ". Submit a replay with `/scrim submit`.");
  const g = sum.perGame;
  return reply([
    `**Your Rocket League numbers** (${sum.games} game${sum.games === 1 ? "" : "s"}${kind === "all" ? "" : `, ${kind}`}; only you can see this)`,
    sum.smallSample ? "A small sample: a first look, not a pattern." : "Averages per game.",
    `Record: ${sum.wins} wins, ${sum.losses} losses`,
    `Score ${one(g.score)} · Goals ${one(g.goals)} · Assists ${one(g.assists)} · Saves ${one(g.saves)} · Shots ${one(g.shots)}`,
    `Shooting ${sum.shootingPercent === null ? "n/a" : Math.round(sum.shootingPercent) + "%"} · Boost per minute ${sum.boostPerMinute === null ? "n/a" : Math.round(sum.boostPerMinute)} · Supersonic ${sum.supersonicPercent === null ? "n/a" : Math.round(sum.supersonicPercent) + "%"}`,
    ...(sum.team ? [`Your side: ${one(sum.team.teamGoalsFor)} goals for, ${one(sum.team.teamGoalsAgainst)} against; shots ${one(sum.team.teamShotsFor)} to ${one(sum.team.teamShotsAgainst)}${sum.team.yourShareOfTeamGoals === null ? "" : `; you scored ${Math.round(sum.team.yourShareOfTeamGoals)}% of your side's goals`}`] : []),
    "Source: Player-submitted Ballchasing replay. These numbers describe those games in their own context, not how good you are.",
    `More: ${s.appUrl.replace(/\/+$/, "")}/dashboard/scrims/rocket-league`,
  ].join("\n"));
}
