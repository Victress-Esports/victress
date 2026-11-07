/** Shown instead of a form whose database table does not exist yet. Honest about what is not available. */
export function ComingSoonNote({ what }: { what: string }) {
  return (
    <p className="rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm text-mute">
      {what} is coming soon. It is not available yet, so there is nothing to save here today.
    </p>
  );
}
