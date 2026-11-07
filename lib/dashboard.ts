import "server-only";

/** Scrim file uploads stay off until the privacy foundation is approved and live, and counsel has reviewed demo content. */
export const scrimUploadsEnabled = () => process.env.SCRIM_UPLOADS_ENABLED === "true";
