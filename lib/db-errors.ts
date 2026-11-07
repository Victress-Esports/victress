/**
 * True when a Supabase query failed because the table does not exist yet (the migration behind it is not applied).
 * PostgREST reports PGRST205 (not in the schema cache) or 42P01 (undefined table). Pages use it to show "Coming soon"
 * instead of a form that could never save.
 */
export function isMissingTable(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return error.code === "PGRST205" || error.code === "42P01" || /could not find the table|does not exist/i.test(error.message ?? "");
}
