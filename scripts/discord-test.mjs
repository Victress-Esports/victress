// Discord integration tests. No network, no real credentials: a throwaway Ed25519 key signs the test requests.
//   node scripts/discord-test.mjs                run the module checks
//   node scripts/discord-test.mjs <port>         also send signed requests to a built app on that port. Start the app with
//                                                VICTRESS_SCRIM_DISCORD_PUBLIC_KEY=$(node scripts/discord-test.mjs --print-key) VICTRESS_SCRIM_DISCORD_APPLICATION_ID=111111111111111111
import { createPrivateKey, createPublicKey, generateKeyPairSync, sign } from "node:crypto";
import { verifyDiscordSignature } from "../lib/discord/verify.ts";
import { handleInteraction, HELP_TEXT, PRIVACY_TEXT } from "../lib/discord/handler.ts";
import { completeDeferred } from "../lib/discord/followup.ts";
import { COMMANDS } from "../lib/discord/commands.ts";
import { readFileSync } from "node:fs";
import { DEFAULT_DEADLINE_MS, STALE_JOB_MS } from "../lib/ballchasing/rl.ts";

let failed = 0;
const check = (ok, name) => { console.log(`${ok ? "PASS" : "FAIL"} ${name}`); if (!ok) failed++; };

// A fixed TEST ONLY key (the seed is a label, not a secret) so a separately started app can share the public half.
// It has nothing to do with the real Discord application's key.
const privateKey = createPrivateKey({ key: Buffer.concat([Buffer.from("302e020100300506032b657004220420", "hex"), Buffer.alloc(32, 7)]), format: "der", type: "pkcs8" });
const publicKey = createPublicKey(privateKey);
const pubHex = publicKey.export({ format: "der", type: "spki" }).subarray(-32).toString("hex");
if (process.argv[2] === "--print-key") { console.log(pubHex); process.exit(0); }
const other = generateKeyPairSync("ed25519");
const ts = () => String(Math.floor(Date.now() / 1000));
const signed = (body, t = ts(), key = privateKey) => ({ body, t, sig: sign(null, Buffer.from(t + body), key).toString("hex") });
const verify = (r, extra = {}) => verifyDiscordSignature({ publicKeyHex: pubHex, signatureHex: r.sig, timestamp: r.t, rawBody: r.body, ...extra });

// Signature verification
const ping = JSON.stringify({ type: 1 });
check(verify(signed(ping)), "a correctly signed request verifies");
check(!verify({ ...signed(ping), body: ping + " " }), "a tampered body is rejected");
check(!verify(signed(ping, ts(), other.privateKey)), "a signature from a different key is rejected");
check(!verify({ ...signed(ping), t: String(Number(ts()) + 1) }), "a changed timestamp is rejected");
check(!verify(signed(ping, String(Math.floor(Date.now() / 1000) - 3600))), "a signed request older than five minutes is rejected (replay)");
check(!verify(signed(ping, String(Math.floor(Date.now() / 1000) + 3600))), "a timestamp far in the future is rejected");
check(!verify({ ...signed(ping), sig: null }) && !verify({ ...signed(ping), t: null }), "missing signature or timestamp is rejected");
check(!verify({ ...signed(ping), sig: "zz".repeat(64) }) && !verify({ ...signed(ping), sig: "ab" }), "malformed signatures are rejected without throwing");
check(!verifyDiscordSignature({ publicKeyHex: "nothex", signatureHex: signed(ping).sig, timestamp: ts(), rawBody: ping }), "a malformed public key is rejected");
check(!verifyDiscordSignature({ publicKeyHex: "", signatureHex: signed(ping).sig, timestamp: ts(), rawBody: ping }), "an empty public key never verifies");

// Handler
const out = (i, o) => handleInteraction(i, o);
check(JSON.stringify(out({ type: 1 }).body) === JSON.stringify({ type: 1 }), "PING is answered with PONG");
const help = out({ type: 2, data: { name: "help" } });
check(help.kind === "respond" && help.body.type === 4 && help.body.data.flags === 64, "/help replies, visible only to the user");
check(help.body.data.allowed_mentions.parse.length === 0, "replies cannot mention anyone");
check(HELP_TEXT.includes("https://victressesports.com/privacy") && HELP_TEXT.includes("https://victressesports.com/terms"), "/help links the published Terms and Privacy");
check(/coming soon/i.test(HELP_TEXT) && /pilot/.test(HELP_TEXT) && !/will analyze|analyz(es|ing) your/i.test(HELP_TEXT), "/help says scrims are for approved pilot players, other games coming soon, and promises nothing more");
const priv = out({ type: 2, data: { name: "privacy" } });
check(priv.kind === "respond" && PRIVACY_TEXT.includes("privacy@victressesports.com") && PRIVACY_TEXT.includes("does not read ordinary messages"), "/privacy states the contact and that ordinary messages are not read");
check(out({ type: 2, data: { name: "nonsense" } }).body.data.content.includes("not available yet"), "an unregistered command is answered as not available");
check(out({ type: 3 }).body.data.flags === 64, "unsupported interaction types get an ephemeral reply");
check(out({ type: 2, application_id: "999", data: { name: "help" } }, { applicationId: "111" }).body.data.content.includes("not meant for"), "an interaction for another application is refused");
check(out({ type: 2, application_id: "111", data: { name: "help" } }, { applicationId: "111" }).body.data.content === HELP_TEXT, "the matching application id is accepted");
check(!/[–—]/.test(HELP_TEXT + PRIVACY_TEXT), "replies contain no em or en dashes");

// Follow up
const calls = [];
const stub = async (url, init) => { calls.push({ url, init }); return { ok: true }; };
check(await completeDeferred("111", "tok/en", { content: "x" }, stub) === true && calls[0].url === "https://discord.com/api/v10/webhooks/111/tok%2Fen/messages/@original" && calls[0].init.method === "PATCH", "a deferred reply edits the original message through the interaction webhook");
check(await completeDeferred("111", "t", { content: "x" }, async () => { throw new Error("net"); }) === false, "a network failure is reported, not thrown");
check(await completeDeferred("111", "t", { content: "x" }, async () => ({ ok: false })) === false, "a Discord error is reported as failure");

// Command registry
const names = COMMANDS.map((c) => c.name);
check(names.join() === "help,privacy,link,unlink,profile,scrim", "exactly the implemented commands are registered");
const walk = (c) => [c, ...(c.options ?? []).flatMap(walk)];
check(COMMANDS.flatMap(walk).every((c) => /^[-_\p{L}\p{N}]{1,32}$/u.test(c.name) && c.name === c.name.toLowerCase() && c.description.length <= 100), "command, subcommand and option names and descriptions meet Discord's limits");
const submit = COMMANDS.find((c) => c.name === "scrim").options.find((o) => o.name === "submit");
check(submit.options.filter((o) => o.required).map((o) => o.name).join() === "link,authorized,consent" && submit.options.every((o, i, a) => i === 0 || !o.required || a[i - 1].required), "scrim submit requires the link, the authorization and the consent confirmations, required options first");
check(COMMANDS.every((c) => JSON.stringify(c.contexts) === "[0]" && JSON.stringify(c.integration_types) === "[0]"), "commands are server only and guild installed (no DMs, no user install)");

// Timing: Discord needs an answer within 3 seconds; the longer work continues afterwards inside a function limit that fits Vercel Hobby.
const routeSrc = readFileSync("app/api/discord/interactions/route.ts", "utf8");
const max = Number((routeSrc.match(/export const maxDuration = (\d+)/) ?? [])[1]);
check(max > 0 && max <= 60, `the endpoint sets maxDuration to ${max} seconds, within what a Vercel Hobby function may run (no paid plan needed)`);
check(DEFAULT_DEADLINE_MS < max * 1000 - 10_000, `a replay submission is stopped at ${DEFAULT_DEADLINE_MS / 1000} seconds, at least 10 seconds before the function limit, so the player always gets a reply`);
check(STALE_JOB_MS > max * 1000, "a submission is only treated as abandoned after the function limit has passed");
check(/after\(async/.test(routeSrc) && /type: 5/.test(routeSrc) && routeSrc.indexOf("after(async") < routeSrc.indexOf("type: 5"), "data commands are acknowledged with a deferred reply and the work runs afterwards in after()");
const idx = readFileSync("lib/ballchasing/index.ts", "utf8");
check(/timeoutMs: 12_000, maxRetries: 1/.test(idx), "the Ballchasing client used for submissions has a 12 second timeout and one retry, so one slow call cannot use the whole budget");

// Optional: the deployed route over HTTP
const port = Number(process.argv[2]);
if (port) {
  const post = async (r, headers = {}) =>
    fetch(`http://127.0.0.1:${port}/api/discord/interactions`, { method: "POST", headers: { "content-type": "application/json", "x-signature-ed25519": r.sig, "x-signature-timestamp": r.t, ...headers }, body: r.body });
  let r = await post(signed(ping));
  check(r.status === 200 && (await r.json()).type === 1, "route: signed PING returns PONG");
  r = await post({ ...signed(ping), sig: signed(ping, ts(), other.privateKey).sig });
  check(r.status === 401, "route: wrong signature returns 401");
  r = await post({ body: ping, t: ts(), sig: "" });
  check(r.status === 401, "route: missing signature returns 401");
  const cmd = JSON.stringify({ type: 2, application_id: "111111111111111111", data: { name: "help" } });
  r = await post(signed(cmd));
  const j = await r.json();
  check(r.status === 200 && j.type === 4 && j.data.flags === 64, "route: signed /help returns an ephemeral message");
  r = await post(signed("not json"));
  check(r.status === 400, "route: signed non JSON body returns 400");
  r = await post(signed("x".repeat(120_000)));
  check(r.status === 413, "route: an oversized body returns 413");
  for (const [body, name] of [[{ name: "link" }, "/link"], [{ name: "profile" }, "/profile"], [{ name: "scrim", options: [{ name: "status", type: 1 }] }, "/scrim status"]]) {
    const t1 = Date.now();
    r = await post(signed(JSON.stringify({ type: 2, application_id: "111111111111111111", token: "interaction-token", member: { user: { id: "123456789012345678", username: "t" } }, data: body })));
    const j2 = await r.json();
    check(r.status === 200 && j2.type === 5 && j2.data.flags === 64 && Date.now() - t1 < 2500, `route: ${name} is acknowledged within 2.5 seconds with a private deferred reply`);
  }
  r = await post(signed(JSON.stringify({ type: 2, application_id: "999", member: { user: { id: "123456789012345678" } }, data: { name: "link" } })));
  check((await r.json()).data?.content?.includes("not meant for"), "route: a command meant for another application is refused, not run");
  r = await fetch(`http://127.0.0.1:${port}/api/discord/interactions`);
  check(r.status === 405, "route: GET is not allowed");
}
console.log(failed ? `\n${failed} FAILED` : "\nAll Discord checks passed.");
process.exit(failed ? 1 : 0);
