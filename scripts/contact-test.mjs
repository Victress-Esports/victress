// Contact and design partner forms against a local stand-in for Resend (RESEND_BASE_URL). Test tooling only; sends no real email.
//   node scripts/contact-test.mjs <app-port>   (app built and started with RESEND_API_KEY=test RESEND_BASE_URL=http://127.0.0.1:4020)
import http from "node:http";
const PORT = Number(process.argv[2] ?? 3200);
const sent = [];
let failAck = false;
const stub = http.createServer((req, res) => {
  let b = "";
  req.on("data", (c) => (b += c));
  req.on("end", () => {
    const m = JSON.parse(b || "{}");
    sent.push(m);
    if (failAck && String(m.subject).startsWith("We received")) { res.writeHead(422, { "content-type": "application/json" }); return res.end(JSON.stringify({ name: "validation_error", message: "stub refused", statusCode: 422 })); }
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ id: "stub" }));
  });
}).listen(4020);
let failed = 0;
const check = (ok, name) => { console.log(`${ok ? "PASS" : "FAIL"} ${name}`); if (!ok) failed++; };
const post = (body) => fetch(`http://127.0.0.1:${PORT}/api/contact`, { method: "POST", headers: { "content-type": "application/json", host: "victressesports.com" }, body: JSON.stringify(body) });

let r = await post({ kind: "organization", name: "Pat Coach", email: "pat@example.test", organization: "Example Club", role: "Coach", teamType: "Women's roster", game: "CS2", message: "SECRET-MESSAGE-TEXT" });
check(r.status === 200 && (await r.json()).ok === true, "an organization application returns ok");
const team = sent.find((m) => String(m.subject).startsWith("[Victress site]"));
const ack = sent.find((m) => String(m.subject) === "We received your message");
check(!!team && JSON.stringify(team.to).includes("hello@victressesports.com"), "the team gets the application at hello@victressesports.com");
check(!!ack && JSON.stringify(ack.to).includes("pat@example.test"), "the submitter gets an acknowledgement");
check(!!ack && /Design Partner pilot application/.test(ack.text) && /does not guarantee a place/.test(ack.text), "the design partner acknowledgement says applying does not guarantee a place");
check(!!ack && !/SECRET-MESSAGE-TEXT|Example Club|Pat Coach/.test(ack.text), "the acknowledgement repeats nothing the visitor typed");
check(!!ack && !/\b(within|hours|days|soon|will reply|we will respond|guarantee(d)? (a )?reply)\b/i.test(ack.text.replace("does not guarantee a place", "")), "no promise about timing or outcome");
check(!!ack && !/[-–—]/.test(ack.text), "no hyphens or dashes in the acknowledgement");
check(!!ack && ack.reply_to === "hello@victressesports.com" || JSON.stringify(ack ?? {}).includes("hello@victressesports.com"), "replies to the acknowledgement go to the team address");

sent.length = 0;
r = await post({ kind: "player", name: "Sam", email: "sam@example.test", game: "VALORANT", message: "" });
check(r.status === 200, "a player request returns ok");
check(sent.some((m) => /access request/.test(m.text ?? "")), "the player acknowledgement names the access request");

sent.length = 0; failAck = true;
r = await post({ kind: "player", name: "Lee", email: "lee@example.test", game: "", message: "" });
check(r.status === 200 && sent.some((m) => String(m.subject).startsWith("[Victress site]")), "if the acknowledgement fails the form still succeeds (the team already has the message)");

sent.length = 0; failAck = false;
r = await post({ kind: "player", name: "Bot", email: "bot@example.test", website: "http://spam.test" });
check(r.status === 200 && sent.length === 0, "a filled honeypot sends nothing and acknowledges nothing");

stub.close();
console.log(failed ? `\n${failed} CONTACT CHECK(S) FAILED` : "\nALL CONTACT CHECKS PASSED");
process.exit(failed ? 1 : 0);
