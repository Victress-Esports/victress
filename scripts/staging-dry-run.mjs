// Builds the SQL for a staging dry run of the three pilot migrations (linking, Rocket League import, team scrims and events) and their database checks, from the repo files (so it cannot drift).
//   node scripts/staging-dry-run.mjs > dry-run.sql
// The script is ONE transaction: begin; the migrations; the test files (each caught and recorded); then an unconditional error and
// rollback. It cannot commit. Run it with the Supabase SQL tool on victress-staging only. Afterwards, check that staging is unchanged:
// no discord_* or team_scrim* objects, no events table, no new columns on game_accounts, game_matches or import_jobs, and the same migration history.
import { readFileSync } from "node:fs";

const strip = (s) => s.split("\n").filter((l) => !l.trim().startsWith("--")).join("\n").trim();
const rd = (p) => strip(readFileSync(new URL(`../${p}`, import.meta.url), "utf8"));

let out = "begin;\n";
out += rd("supabase/migrations/20261112000100_discord_account_link.sql") + "\n";
out += rd("supabase/migrations/20261112000200_rocket_league_link_import.sql") + "\n";
out += rd("supabase/migrations/20261113000100_team_scrims_and_events.sql") + "\n";
out += "create temp table dry_results(t text, msg text);\ndo $outer$ begin\n";
for (const [name, file] of [
  ["discord_link", "supabase/tests/discord_link.sql"],
  ["rocket_league_import", "supabase/tests/rocket_league_import.sql"],
  ["team_scrims", "supabase/tests/team_scrims.sql"],
]) {
  out += `  begin execute $t$${rd(file)}$t$; exception when others then insert into dry_results values ('${name}', sqlerrm); end;\n`;
}
out += "end $outer$;\n";
out += "do $final$ declare r text; begin select string_agg(t || E':\\n' || msg, E'\\n\\n') into r from dry_results; raise exception E'DRY RUN COMPLETE. NOTHING COMMITTED.\\n%', r; end $final$;\n";
out += "rollback;\n";
process.stdout.write(out);
