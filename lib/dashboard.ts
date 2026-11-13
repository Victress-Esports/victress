import "server-only";

/** Scrim file uploads stay off until the privacy foundation is approved and live, and counsel has reviewed demo content. */
export const scrimUploadsEnabled = () => process.env.SCRIM_UPLOADS_ENABLED === "true";

/**
 * The League of Legends import (Riot) is built but NOT part of the Rocket League pilot. It stays hidden and disabled until the founder has
 * verified the Riot key (a key that is present but rejected by Riot must not produce a working looking screen) and sets LOL_IMPORT_ENABLED=true.
 * It also needs the same pilot flag as everything else here. The Riot code, tables and tests are untouched.
 */
export const lolImportEnabled = () => scrimUploadsEnabled() && process.env.LOL_IMPORT_ENABLED === "true";
