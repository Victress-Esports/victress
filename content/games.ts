// One modular config per game: roles, ranks and stat categories.
// All stats are entered by the player and shown as "Self-reported". There are no automated game integrations.
//
// Sources checked Nov 2026 (see docs/games.md for links and open questions):
//   VALORANT: agent roles and the Iron to Radiant ladder.
//   CS2: Premier (CS Rating) and the 18 Competitive skill groups.
//   Rocket League: Epic Games help article "What are Rocket League Competitive Ranks?".
//   League of Legends: official wiki "Rank (League of Legends)" and the five lane positions.
//   Apex Legends: EA help "How Apex Legends Ranked works" and the character abilities guide (five legend classes).
//   Overwatch 2: Role Queue ranks (Bronze to Champion) and the Tank, Damage, Support roles.

export type GameId = "VALORANT" | "CS2" | "ROCKET_LEAGUE" | "LOL" | "APEX" | "OVERWATCH2";

export interface StatField {
  /** Stored as a key in stat_entries.metrics. Lowercase letters, numbers, underscores. */
  key: string;
  label: string;
  suffix?: string;
  min: number;
  max: number;
  decimals: number;
}

export interface GameConfig {
  id: GameId;
  /** URL slug used by /leaderboard/{slug}. */
  slug: string;
  name: string;
  /** Featured games get homepage and marketing placement. All games are fully available in onboarding and profiles. */
  featured: boolean;
  /** What the game calls a role ("Role", "Legend class"). Empty `roles` means the game has no fixed roles. */
  roleLabel: string;
  roles: string[];
  ranks: string[];
  stats: StatField[];
  /** Stat the leaderboard sorts by by default. Must be one of `stats`. */
  leaderboardStat: string;
}

const pct = (key: string, label: string): StatField => ({ key, label, suffix: "%", min: 0, max: 100, decimals: 0 });
const matches = (label = "Matches"): StatField => ({ key: "matches", label, min: 0, max: 100000, decimals: 0 });

const VALORANT: GameConfig = {
  id: "VALORANT",
  slug: "valorant",
  name: "VALORANT",
  featured: true,
  roleLabel: "Role",
  roles: ["Duelist", "Initiator", "Controller", "Sentinel"],
  ranks: ["Iron", "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Ascendant", "Immortal", "Radiant"],
  stats: [
    { key: "kd", label: "K/D", min: 0, max: 10, decimals: 2 },
    { key: "acs", label: "Avg combat score", min: 0, max: 700, decimals: 0 },
    pct("hs_pct", "Headshot %"),
    pct("win_rate", "Win rate"),
    matches(),
  ],
  leaderboardStat: "acs",
};

const CS2: GameConfig = {
  id: "CS2",
  slug: "cs2",
  name: "Counter-Strike 2",
  featured: true,
  roleLabel: "Role",
  // Not game-defined: these are the community's standard CS roles.
  roles: ["Entry", "AWPer", "Support", "Lurker", "In-game leader"],
  // Competitive skill-group families (each has several tiers in game). Premier uses a numeric rating, tracked as a stat.
  ranks: ["Silver", "Gold Nova", "Master Guardian", "Legendary Eagle", "Supreme", "Global Elite"],
  stats: [
    { key: "premier_rating", label: "Premier rating", min: 0, max: 40000, decimals: 0 },
    { key: "kd", label: "K/D", min: 0, max: 10, decimals: 2 },
    { key: "adr", label: "ADR", min: 0, max: 300, decimals: 0 },
    pct("hs_pct", "Headshot %"),
    pct("win_rate", "Win rate"),
    matches(),
  ],
  leaderboardStat: "premier_rating",
};

const ROCKET_LEAGUE: GameConfig = {
  id: "ROCKET_LEAGUE",
  slug: "rocket-league",
  name: "Rocket League",
  featured: false,
  roleLabel: "Role",
  roles: [], // no fixed roles
  // Families; each has tiers I to III in game. Supersonic Legend is the top rank.
  ranks: ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Champion", "Grand Champion", "Supersonic Legend"],
  stats: [
    { key: "goals_pg", label: "Goals per game", min: 0, max: 10, decimals: 2 },
    { key: "assists_pg", label: "Assists per game", min: 0, max: 10, decimals: 2 },
    { key: "saves_pg", label: "Saves per game", min: 0, max: 10, decimals: 2 },
    pct("shooting_pct", "Shooting %"),
    pct("win_rate", "Win rate"),
    matches(),
  ],
  leaderboardStat: "win_rate",
};

const LOL: GameConfig = {
  id: "LOL",
  slug: "league-of-legends",
  name: "League of Legends",
  featured: false,
  roleLabel: "Position",
  roles: ["Top", "Jungle", "Mid", "Bot", "Support"],
  ranks: ["Iron", "Bronze", "Silver", "Gold", "Platinum", "Emerald", "Diamond", "Master", "Grandmaster", "Challenger"],
  stats: [
    { key: "kda", label: "KDA", min: 0, max: 30, decimals: 2 },
    { key: "cs_per_min", label: "CS per minute", min: 0, max: 15, decimals: 1 },
    { key: "vision_per_min", label: "Vision score per minute", min: 0, max: 10, decimals: 1 },
    pct("kill_participation", "Kill participation"),
    pct("win_rate", "Win rate"),
    matches("Games"),
  ],
  leaderboardStat: "kda",
};

const APEX: GameConfig = {
  id: "APEX",
  slug: "apex-legends",
  name: "Apex Legends",
  featured: false,
  roleLabel: "Legend class",
  roles: ["Assault", "Skirmisher", "Recon", "Controller", "Support"],
  ranks: ["Rookie", "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Master", "Apex Predator"],
  stats: [
    { key: "avg_damage", label: "Avg damage per game", min: 0, max: 5000, decimals: 0 },
    { key: "kd", label: "K/D", min: 0, max: 20, decimals: 2 },
    { key: "kills_per_game", label: "Kills per game", min: 0, max: 30, decimals: 1 },
    pct("win_rate", "Win rate"),
    matches(),
  ],
  leaderboardStat: "avg_damage",
};

const OVERWATCH2: GameConfig = {
  id: "OVERWATCH2",
  slug: "overwatch-2",
  name: "Overwatch 2",
  featured: false,
  roleLabel: "Role",
  roles: ["Tank", "Damage", "Support"],
  ranks: ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Master", "Grandmaster", "Champion"],
  stats: [
    { key: "elims_10", label: "Eliminations per 10 min", min: 0, max: 60, decimals: 1 },
    { key: "deaths_10", label: "Deaths per 10 min", min: 0, max: 30, decimals: 1 },
    { key: "damage_10", label: "Damage per 10 min", min: 0, max: 30000, decimals: 0 },
    { key: "healing_10", label: "Healing per 10 min", min: 0, max: 30000, decimals: 0 },
    pct("win_rate", "Win rate"),
    matches(),
  ],
  leaderboardStat: "win_rate",
};

/** Display order. */
export const GAME_LIST: GameConfig[] = [VALORANT, CS2, ROCKET_LEAGUE, LOL, APEX, OVERWATCH2];
export const GAMES = Object.fromEntries(GAME_LIST.map((g) => [g.id, g])) as Record<GameId, GameConfig>;
export const GAME_IDS = GAME_LIST.map((g) => g.id) as [GameId, ...GameId[]];
export const FEATURED_GAMES = GAME_LIST.filter((g) => g.featured);

export const isGameId = (v: unknown): v is GameId => typeof v === "string" && v in GAMES;
export const getGame = (id: string | null | undefined): GameConfig | null => (id && isGameId(id) ? GAMES[id] : null);
export const gameBySlug = (slug: string) => GAME_LIST.find((g) => g.slug === slug) ?? null;

/** NEXT_PUBLIC_LAUNCH_GAME: the default game and homepage focus only. Every game stays available everywhere else. */
export function launchGame(): GameConfig {
  const raw = (process.env.NEXT_PUBLIC_LAUNCH_GAME ?? "VALORANT").toUpperCase();
  return isGameId(raw) ? GAMES[raw] : VALORANT;
}

export const formatStat = (f: StatField, value: number) => `${value.toFixed(f.decimals)}${f.suffix ?? ""}`;
