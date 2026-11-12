import { after } from "next/server";
import { completeDeferred } from "@/lib/discord/followup";
import { handleInteraction, logLine } from "@/lib/discord/handler";
import type { Interaction } from "@/lib/discord/types";
import { verifyDiscordSignature } from "@/lib/discord/verify";

// Discord interactions endpoint (HTTP, no Gateway). Set this URL as the application's Interactions Endpoint URL:
//   https://victress.gg/api/discord/interactions
// Discord sends a signed PING when the URL is saved, and it signs every interaction after that.
// Credentials: DISCORD_PUBLIC_KEY (public, from the Developer Portal) verifies requests. The bot token is NOT used here.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 100_000;
const text = (status: number, body: string) =>
  new Response(body, { status, headers: { "content-type": "text/plain", "cache-control": "no-store" } });

export async function POST(req: Request) {
  const publicKey = process.env.DISCORD_PUBLIC_KEY;
  if (!publicKey) {
    logLine("not_configured");
    return text(503, "Discord integration is not configured.");
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return text(413, "Request too large.");

  const ok = verifyDiscordSignature({
    publicKeyHex: publicKey,
    signatureHex: req.headers.get("x-signature-ed25519"),
    timestamp: req.headers.get("x-signature-timestamp"),
    rawBody: raw,
  });
  if (!ok) {
    logLine("bad_signature");
    return text(401, "Invalid request signature.");
  }

  let interaction: Interaction;
  try {
    interaction = JSON.parse(raw) as Interaction;
  } catch {
    return text(400, "Invalid JSON.");
  }

  let outcome;
  try {
    outcome = handleInteraction(interaction, { applicationId: process.env.DISCORD_APPLICATION_ID });
  } catch {
    logLine("handler_error", { type: interaction.type });
    return Response.json({ type: 4, data: { content: "Something went wrong. Try again.", flags: 64, allowed_mentions: { parse: [] } } });
  }

  logLine("interaction", { type: interaction.type, command: interaction.data?.name, deferred: outcome.kind === "deferred" });

  if (outcome.kind === "respond") return Response.json(outcome.body, { headers: { "cache-control": "no-store" } });

  // Longer work: acknowledge within Discord's 3 second limit, finish afterwards, then edit the original reply.
  const { application_id: appId, token } = interaction;
  if (!appId || !token) return text(400, "Missing interaction details.");
  after(async () => {
    let message;
    try {
      message = await outcome.work();
    } catch {
      logLine("deferred_error", { command: interaction.data?.name });
      message = { content: "Something went wrong. Try again.", flags: 64, allowed_mentions: { parse: [] as string[] } };
    }
    if (!(await completeDeferred(appId, token, message))) logLine("followup_failed", { command: interaction.data?.name });
  });
  return Response.json({ type: 5, data: { flags: 64 } }, { headers: { "cache-control": "no-store" } });
}
