// Checks the code facts the Privacy Policy relies on (content/legal.ts). Static checks only; no server or database.
//   node scripts/policy-facts-test.mjs
// If one fails, either the code changed or the policy is wrong: fix one of them before release.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
let failed = 0;
const check = (ok, name) => { console.log(`${ok ? "PASS" : "FAIL"} ${name}`); if (!ok) failed++; };
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const read = (p) => readFileSync(p, "utf8");
const legal = read("content/legal.ts");
const policy = legal.slice(legal.indexOf("export const privacyDoc"), legal.indexOf("export const termsDoc")); // the Privacy Policy only
const mig = read("supabase/migrations/20261113000100_team_scrims_and_events.sql");

// Public surfaces and Scout Desk never read team scrims, lines, games or events
const publicFiles = [...walk("app/a/[handle]"), ...walk("app/a/r"), ...walk("app/api/og"), ...walk("app/a/dashboard/scout"), ...walk("app/a/leaderboard"), "lib/privacy.ts", ...walk("app/sitemap"), "app/sitemap.xml/route.ts"].filter((f) => /\.(ts|tsx)$/.test(f));
const hits = publicFiles.filter((f) => /team_scrims|team_scrim_lines|team_stat_sharing|game_matches|["']events["']|record_event/.test(read(f)));
check(publicFiles.length > 5 && hits.length === 0, `public profiles, share links, social cards, leaderboards, sitemaps and Scout Desk read none of these tables${hits.length ? `: ${hits.join(", ")}` : ""}`);
const publicFns = read("supabase/migrations/20261107000200_privacy_contract.sql") + read("supabase/migrations/20261107000100_privacy_expand.sql");
check(!/team_scrims|game_matches|public\.events/.test(publicFns), "the public profile database functions read none of these tables");

// Events: server only, limited fields, deleted with the account, not sent elsewhere
check(/alter table public\.events enable row level security;\s+-- no policies/.test(mig) && /revoke all on public\.events from public, anon, authenticated, service_role;/.test(mig), "events: no client access (row level security with no policies, all grants revoked)");
check(/k not in \('source', 'referral', 'game'\)/.test(mig), "events: only source, referral and game are accepted as extra data");
check(/profile_id uuid not null references public\.profiles \(id\) on delete cascade,\s+props/.test(mig), "events are deleted with the account");
const evLib = read("lib/events.ts");
check(!/fetch\(|https?:\/\//.test(evLib.replace(/\/\/.*$/gm, "")), "events are written only to the Victress database (no outside service)");
check(!/12 months/.test(policy), "the policy promises no 12 month event deletion (purge_events is not scheduled)");

// Team scrims and lines
check(/team_id uuid not null references public\.teams \(id\) on delete cascade/.test(mig) && /submitted_by uuid references public\.profiles \(id\) on delete set null/.test(mig), "team scrims stay with the team; the submitter is cleared when their account is deleted");
check(/scrim_id uuid not null references public\.team_scrims \(id\) on delete cascade,\s+profile_id uuid not null references public\.profiles \(id\) on delete cascade/.test(mig), "lines are deleted with the scrim and with the player's account");
check(/after delete on public\.team_stat_sharing/.test(mig) && /after delete on public\.team_members/.test(mig), "turning sharing off, leaving or being removed deletes the player's lines");
check(/create policy "members read their team's scrims" on public\.team_scrims\s+for select to authenticated using \(public\.is_team_member\(team_id\)\)/.test(mig), "only current team members read a team's scrims");
check(/where e\.key not in \('score', 'goals', 'assists', 'saves', 'shots'\)/.test(mig), "totals and lines hold only goals, assists, saves, shots and score");
const page = read("app/a/dashboard/team/scrims/page.tsx");
check(!/replay_id/.test(page), "the team page does not show the replay id");

// Snapshots: keyed hash only, players cannot read the key, own side only, 90 day purge (migration 20261116000100, lib/ballchasing/team.ts)
const snap = read("supabase/migrations/20261116000100_rl_snapshots_and_steam_verification.sql");
check(/identity_key text not null check \(identity_key ~ '\^\[0-9a-f\]\{64\}\$'\)/.test(snap) && !/platform text|external_id/.test(snap.slice(snap.indexOf("create table public.rl_snapshots"), snap.indexOf("create index rl_snapshots_key_idx"))), "snapshots store a 64 hex key, never a platform or id column");
check(/grant select \(id, replay_id, played_at, duration_seconds, queue_kind, result, goals_for, goals_against, overtime, stats, claimed_at\)/.test(snap), "players cannot read the identity key (column grants)");
check(/purge_rl_snapshots\(p_days integer default 90\)/.test(snap) && /claimed_by is null and \(created_at < now\(\) - make_interval\(days => p_days\) or team_scrim_id is null\)/.test(snap), "unclaimed snapshots: 90 days, or when the scrim is gone");
check(/Opponents are never read/.test(read("lib/ballchasing/team.ts")), "snapshots are built from the submitter's own side only");
for (const t of ["coded key made from their platform ID with a secret only Victress holds", "Opponents get no snapshots", "Unclaimed snapshots: deleted 90 days after they are made", "Steam (Valve): only if you choose to verify a Steam account"]) check(policy.includes(t), `policy says: ${t}`);

// The policy says each of these
for (const t of ["Team scrims can be seen only by the current members of that team", "Scouts and recruiters cannot see them", "Product events: until you delete your account.", "deletes your lines from that team's scrims", "not sent to any analytics or advertising service", "This policy is pending legal review"]) check(policy.includes(t), `policy says: ${t}`);
console.log(failed ? `\n${failed} FAILED` : "\nAll policy fact checks passed.");
process.exit(failed ? 1 : 0);
