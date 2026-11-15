// Checks whether a verified Epic Account ID appears in a Ballchasing replay EXACTLY (platform "epic" and the same id string).
// Operator tool for the staging Epic test. Prints no player ids or names: only SHA-256 fingerprints are compared.
//   node scripts/epic-ballchasing-match.mjs <replay id or ballchasing.com/replay/... link> <sha256 hex of the verified Epic Account ID>
// Get the fingerprint from staging (read only), for the tester's own account:
//   select encode(extensions.digest(external_id, 'sha256'), 'hex') from public.game_accounts
//   where verified_via = 'epic_oauth' and profile_id = '<tester profile id>';
// Needs BALLCHASING_API_TOKEN (in this cloud environment the proxy adds it). The replay must be Unlisted or Public.
import { createHash } from "node:crypto";

const [ref, want] = process.argv.slice(2);
const id = (ref ?? "").match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0];
if (!id || !/^[0-9a-f]{64}$/.test(want ?? "")) {
  console.error("usage: node scripts/epic-ballchasing-match.mjs <replay id or link> <sha256 hex of the Epic Account ID>");
  process.exit(2);
}
const sha = (s) => createHash("sha256").update(s).digest("hex");
const token = process.env.BALLCHASING_API_TOKEN?.trim();
const res = await fetch(`https://ballchasing.com/api/replays/${id}`, token ? { headers: { Authorization: token } } : {});
if (!res.ok) { console.log(`Ballchasing returned ${res.status} (private replay, wrong id, or no token).`); process.exit(1); }
const r = await res.json();
const slots = ["blue", "orange"].flatMap((side) => (r[side]?.players ?? []).map((p) => ({ side, platform: p.id?.platform ?? null, id: p.id?.id ?? "" })));
const exact = slots.filter((s) => s.platform === "epic" && sha(s.id) === want);
const sameIdOtherPlatform = slots.filter((s) => s.platform !== "epic" && sha(s.id) === want);
const caseOnly = slots.filter((s) => sha(s.id) !== want && sha(s.id.toLowerCase()) === want);
console.log(`replay ${id}: ${slots.length} player slots, ${slots.filter((s) => s.platform === "epic").length} on platform epic`);
console.log(`EXACT MATCH (platform epic, identical id): ${exact.length === 1 ? "YES, on the " + exact[0].side + " side" : exact.length > 1 ? "AMBIGUOUS (" + exact.length + " slots)" : "NO"}`);
if (!exact.length) {
  console.log(`  same id under another platform: ${sameIdOtherPlatform.length ? sameIdOtherPlatform.map((s) => s.platform).join(", ") : "no"}`);
  console.log(`  matches only if letter case is ignored: ${caseOnly.length ? "yes" : "no"}`);
  console.log("  If you played this replay on Epic and this says NO, the Epic sign-in account ID and Ballchasing's id differ: stop and report.");
}
process.exit(exact.length === 1 ? 0 : 1);
