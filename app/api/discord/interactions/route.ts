import { after } from "next/server";
import { ballchasingClient } from "@/lib/ballchasing";
import { runReplayImport, sweepStaleJobs } from "@/lib/ballchasing/rl";
import { summarizeRl } from "@/lib/ballchasing/summary";
import { scrimUploadsEnabled } from "@/lib/dashboard";
import { LEGAL_VERSIONS } from "@/content/legal-versions";
import { DB_COMMANDS, runDeferred } from "@/lib/discord/commands-run";
import { discordEnv } from "@/lib/discord/env";
import { hashLinkCode, linkUrl, newLinkCode } from "@/lib/discord/link";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { completeDeferred } from "@/lib/discord/followup";
import { handleInteraction, logLine } from "@/lib/discord/handler";
import type { Interaction } from "@/lib/discord/types";
import { verifyDiscordSignature } from "@/lib/discord/verify";

// Discord interactions endpoint (HTTP, no Gateway). Set this URL as the application's Interactions Endpoint URL:
//   https://victress.gg/api/discord/interactions
// Discord sends a signed PING when the URL is saved, and it signs every interaction after that.
// Credentials: the Discord public key (public, from the Developer Portal) verifies requests, and the application id is checked.
// Names: VICTRESS_SCRIM_DISCORD_PUBLIC_KEY / _APPLICATION_ID, with DISCORD_PUBLIC_KEY / DISCORD_APPLICATION_ID as a fallback (lib/discord/env.ts).
// The bot token is NOT used here: it is only for the local command registration script.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Replies to Discord within its 3 second limit and finishes longer work afterwards (Next.js after()). 60 seconds is the longest a Vercel Hobby
// function may run, so no paid plan is needed; the replay import has its own 40 second deadline inside this (lib/ballchasing/rl.ts).
export const maxDuration = 60;

const MAX_BODY_BYTES = 100_000;
const text = (status: number, body: string) =>
  new Response(body, { status, headers: { "content-type": "text/plain", "cache-control": "no-store" } });

export async function POST(req: Request) {
  const cfg = discordEnv();
  const publicKey = cfg.publicKey;
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
    const wantedApp = cfg.applicationId;
    const forThisApp = !wantedApp || !interaction.application_id || interaction.application_id === wantedApp;
    if (forThisApp && interaction.type === 2 && DB_COMMANDS.has(interaction.data?.name ?? "")) {
      // Commands that use Victress data: acknowledge now, do the work afterwards (Discord allows 3 seconds to answer).
      outcome = {
        kind: "deferred" as const,
        work: async () => {
          const admin = supabaseAdmin();
          if (!admin) return { content: "This is not available right now. Try again later.", flags: 64, allowed_mentions: { parse: [] as string[] } };
          const bc = ballchasingClient();
          return runDeferred(interaction, {
            admin, appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "https://victress.gg", pilotOpen: scrimUploadsEnabled(),
            consentOk: async (profileId) => {
              const { data, error } = await admin.rpc("discord_consent_current", { p_profile: profileId, p_terms: LEGAL_VERSIONS.terms, p_privacy: LEGAL_VERSIONS.privacy });
              return !error && data === true;
            },
            sweepStale: (userId) => sweepStaleJobs(admin, userId),
            newCode: newLinkCode, hashCode: hashLinkCode, linkUrl,
            importReplay: async (userId, link, o) =>
              bc ? runReplayImport({ admin, client: bc }, userId, link, o) : { ok: false, message: "Rocket League replay import is not configured on this server yet." },
            summarize: (rows, kind) => summarizeRl(rows as never, kind),
          });
        },
      };
    } else {
      outcome = handleInteraction(interaction, { applicationId: wantedApp });
    }
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
