// Discord interaction signature verification (Ed25519). Self contained on purpose: only node:crypto, no dependencies.
// Discord signs `timestamp + rawBody` with the application's private key; we verify with the application's PUBLIC key.
// The public key is not a secret and is not the bot token. A request that fails verification must be rejected with 401.
import { createPublicKey, verify } from "node:crypto";

// DER prefix for an Ed25519 SubjectPublicKeyInfo; the raw 32 byte key follows it.
const SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");
const HEX = /^[0-9a-fA-F]+$/;

/** Maximum age (and clock skew) of a signed request, in seconds. Limits replay of a captured request. */
export const MAX_SKEW_SECONDS = 300;

export function verifyDiscordSignature(input: {
  publicKeyHex: string;
  signatureHex: string | null;
  timestamp: string | null;
  rawBody: string;
  nowMs?: number;
}): boolean {
  try {
    const { publicKeyHex, signatureHex, timestamp, rawBody } = input;
    if (!signatureHex || !timestamp) return false;
    if (publicKeyHex.length !== 64 || !HEX.test(publicKeyHex)) return false;
    if (signatureHex.length !== 128 || !HEX.test(signatureHex)) return false;
    if (!/^\d{1,12}$/.test(timestamp)) return false;
    const ageSeconds = Math.abs((input.nowMs ?? Date.now()) / 1000 - Number(timestamp));
    if (ageSeconds > MAX_SKEW_SECONDS) return false;
    const key = createPublicKey({
      key: Buffer.concat([SPKI_PREFIX, Buffer.from(publicKeyHex, "hex")]),
      format: "der",
      type: "spki",
    });
    return verify(null, Buffer.from(timestamp + rawBody, "utf8"), key, Buffer.from(signatureHex, "hex"));
  } catch {
    return false;
  }
}
