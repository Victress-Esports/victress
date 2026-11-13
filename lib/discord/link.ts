// Code handling for Discord account linking. The code is the secret in the link the player opens; only its SHA 256 hash is stored.
import { createHash, randomBytes } from "node:crypto";

/** 32 random bytes as 43 URL safe characters. */
export const newLinkCode = () => randomBytes(32).toString("base64url");
export const hashLinkCode = (code: string) => createHash("sha256").update(code).digest("hex");
export const isLinkCode = (code: unknown): code is string => typeof code === "string" && /^[A-Za-z0-9_-]{43}$/.test(code);
/** The text of the confirmation the player agrees to on the website. Change the date only together with that text. */
export const DISCORD_LINK_CONSENT_VERSION = "2026-11-12";
export const linkUrl = (appUrl: string, code: string) => `${appUrl.replace(/\/+$/, "")}/dashboard/link/discord/${code}`;
