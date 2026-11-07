import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * Privacy and access foundation (server only).
 * Everything the public can see is read through service_role only database functions that return only what the
 * player consented to. Exposure increasing features stay off until their flag is "true" (Trust & Safety readiness).
 */
export const sharingEnabled = () => process.env.SHARING_ENABLED === "true";
export const directoryEnabled = () => process.env.DIRECTORY_ENABLED === "true";

export const FIELD_KEYS = ["display_name", "avatar", "bio", "team", "stats", "rank_role"] as const;
export type FieldKey = (typeof FIELD_KEYS)[number];
export type Fields = Record<FieldKey, boolean>;
export const NO_FIELDS: Fields = { display_name: false, avatar: false, bio: false, team: false, stats: false, rank_role: false };

/** Keeps only known keys with boolean values; everything else is off. */
export function cleanFields(input: unknown): Fields {
  const out = { ...NO_FIELDS };
  if (input && typeof input === "object" && !Array.isArray(input)) {
    for (const k of FIELD_KEYS) if ((input as Record<string, unknown>)[k] === true) out[k] = true;
  }
  return out;
}

/** 256 bit random token. Only the SHA-256 hash is stored; the token is shown to its owner once. */
export function newShareToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
export const TOKEN_SHAPE = /^[A-Za-z0-9_-]{43}$/;

export type PublicPayload = {
  handle: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  team_name: string | null;
  game: string | null;
  role: string | null;
  rank: string | null;
  games: { game: string; is_primary: boolean; role: string | null; rank: string | null }[];
  metrics: Record<string, number> | null;
  metrics_source: "self_reported" | null;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
  search_indexable?: boolean;
};

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T | null> {
  const db = supabaseAdmin();
  if (!db) return null;
  const { data, error } = await db.rpc(fn, args);
  if (error) throw new Error(`${fn}: ${error.message}`);
  return (data ?? null) as T | null;
}

export async function sharedProfile(token: string) {
  if (!sharingEnabled() || !TOKEN_SHAPE.test(token)) return null;
  return rpc<PublicPayload>("shared_profile", { p_hash: hashToken(token) });
}

export async function directoryProfile(handle: string) {
  if (!directoryEnabled()) return null;
  return rpc<PublicPayload>("directory_profile", { p_handle: handle });
}

export async function handleAvailable(handle: string) {
  return (await rpc<boolean>("handle_available", { p_handle: handle })) === true;
}
