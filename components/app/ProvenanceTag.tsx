import { PROVENANCE, type Provenance } from "@/content/provenance";

/** Small label showing where a number came from. */
export function ProvenanceTag({ source }: { source: Provenance }) {
  return (
    <span className="inline-flex items-center rounded-full border border-line bg-surface-2 px-2.5 py-0.5 text-xs font-semibold text-mute">
      {PROVENANCE[source].label}
    </span>
  );
}
