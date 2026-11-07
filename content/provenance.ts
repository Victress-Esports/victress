/**
 * Data provenance. Every stat records where it came from, and the three sources are never mixed up.
 * Verification establishes the provenance and integrity of evidence. It never judges a player's ability.
 */
export type Provenance = "self_reported" | "api" | "demo_parsed";

export const PROVENANCE: Record<Provenance, { label: string; line: string; available: boolean }> = {
  self_reported: { label: "Self-reported", line: "Entered by the player.", available: true },
  api: { label: "API", line: "Obtained through a game API.", available: false },
  demo_parsed: { label: "Demo parsed", line: "Extracted from an uploaded demo or replay.", available: false },
};
export const PROVENANCE_ORDER: Provenance[] = ["self_reported", "api", "demo_parsed"];

export const SCRIM_EXTENSIONS = ["dem", "rofl", "replay", "zip", "gz", "bz2", "7z"] as const;
export const MAX_SCRIM_BYTES = 200 * 1024 * 1024;
