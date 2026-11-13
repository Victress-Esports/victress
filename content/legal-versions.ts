// The current version of each legal document, as the date it took effect. Raising a version here is what makes every
// signed-in player accept that document again (the app compares it with legal_acceptances). Change it only together with the
// document text in content/legal.ts. Legal text stays pending counsel review.
export const LEGAL_VERSIONS = { terms: "2026-11-10", privacy: "2026-11-12" } as const;
export type LegalDocument = keyof typeof LEGAL_VERSIONS;
export const LEGAL_DOCUMENTS = Object.keys(LEGAL_VERSIONS) as LegalDocument[];

/** The youngest age Victress accepts. The database enforces the same number (age_confirmations). */
export const MINIMUM_AGE = 13;

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** "2026-11-07" becomes "Effective November 7, 2026". */
export function effectiveLabel(version: string): string {
  const [y, m, d] = version.split("-").map(Number);
  return `Effective ${MONTHS[m - 1]} ${d}, ${y}`;
}
