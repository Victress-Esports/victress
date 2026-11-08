// Funnel event checks against a built app and the mock Supabase (which records service role inserts at GET /dev/funnel).
//   MOCK_AUTH=1 node scripts/mock-supabase.mjs 4010 &      (build and start the app with the mock env, port 3210)
//   node scripts/funnel-test.mjs 3210 4010
const [appPort, mockPort] = process.argv.slice(2);
if (!appPort || !mockPort) { console.error("usage: node scripts/funnel-test.mjs <appPort> <mockPort>"); process.exit(2); }
let failed = 0;
const check = (ok, n) => { console.log(`${ok ? "PASS" : "FAIL"} ${n}`); if (!ok) failed++; };
const post = (body, ip = "10.0.0.1") => fetch(`http://127.0.0.1:${appPort}/api/events`, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": ip }, body: typeof body === "string" ? body : JSON.stringify(body) });
const rows = async () => (await (await fetch(`http://127.0.0.1:${mockPort}/dev/funnel`)).json());
const before = (await rows()).length;

let r = await post({ name: "registration_started", method: "discord" });
check(r.status === 204 && !r.headers.get("set-cookie"), "registration_started returns 204 and sets no cookie");
let all = await rows();
check(all.length === before + 1 && all.at(-1).name === "registration_started" && all.at(-1).profile_id === null && all.at(-1).props.method === "discord", "stored with no identity and only the method");
check(Object.keys(all.at(-1)).sort().join() === "name,profile_id,props", "the stored row has only name, profile_id and props (no IP, agent, referrer or URL)");
r = await post({ name: "registration_completed", method: "email" });
check(r.status === 400, "visitors cannot send any other event name");
r = await post({ name: "registration_started", method: "email", email: "a@b.co" });
check(r.status === 400, "extra fields (such as an email) are rejected");
r = await post({ name: "registration_started", method: "tiktok" });
check(r.status === 400, "unknown sign in method rejected");
r = await post("not json");
check(r.status === 400, "malformed body rejected");
check((await rows()).length === before + 1, "rejected requests stored nothing");
for (let i = 0; i < 25; i++) await post({ name: "registration_started", method: "email" }, "10.0.0.9");
all = await rows();
check(all.length - before - 1 === 20, `rate limit: 20 per IP per hour are stored, the rest are ignored (stored ${all.length - before - 1})`);
r = await fetch(`http://127.0.0.1:${appPort}/api/events`);
check(r.status === 405, "GET is not allowed");
console.log(failed ? `\n${failed} FAILED` : "\nall passed"); process.exit(failed ? 1 : 0);
