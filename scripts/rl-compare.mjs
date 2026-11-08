// Scoreboard comparison for the Rocket League validation harness. Pure; tested by scripts/rl-compare-test.mjs.
export const FIELDS = ["score", "goals", "assists", "saves", "shots"];
const n0 = (v) => (typeof v === "number" ? v : 0); // the game never sent an update: the value is zero

/**
 * parsed = output of tools/rlparse: { header, network } or { error }.
 * Truth is the scoreboard stored in the replay header. A file passes only if every header player is found in the network data
 * with the same team and every field equal, there are no extra network players, and both team scores are equal.
 * Causes: parse_error, no_header_players, team_score, player_count, player_not_found, team_unresolved (network never gave the
 * player a team), team_mismatch, field_<name>.
 */
export function compare(parsed) {
  if (parsed.error) return { pass: false, causes: ["parse_error"] };
  const { header: h, network: n } = parsed;
  const causes = [];
  if (n0(h.team0_score) !== n0(n.team0_score) || n0(h.team1_score) !== n0(n.team1_score)) causes.push("team_score");
  if (!h.players.length) causes.push("no_header_players");
  if (h.players.length !== n.players.length) causes.push("player_count");
  const pool = n.players.map((p) => ({ ...p, used: false }));
  for (const hp of h.players) {
    const m = pool.find((p) => !p.used && p.name === hp.name && p.team === hp.team) ?? pool.find((p) => !p.used && p.name === hp.name);
    if (!m) { causes.push("player_not_found"); continue; }
    m.used = true;
    if (m.team !== hp.team) causes.push(typeof m.team === "number" ? "team_mismatch" : "team_unresolved");
    for (const f of FIELDS) if (n0(hp[f]) !== n0(m[f])) causes.push(`field_${f}`);
  }
  return { pass: causes.length === 0, causes: [...new Set(causes)] };
}
