/** Whole years between a birth date (YYYY-MM-DD) and today, or null when the date is not a real, past date. */
export function ageOn(birthDate: string, today = new Date()): number | null {
  const [y, m, d] = birthDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d || y < 1900) return null;
  let age = today.getUTCFullYear() - y;
  if (today.getUTCMonth() < m - 1 || (today.getUTCMonth() === m - 1 && today.getUTCDate() < d)) age--;
  return age < 0 ? null : age;
}
