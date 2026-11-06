import type { Metadata } from "next";
import { copy } from "@/content/copy";

export const metadata: Metadata = { title: "Terms", alternates: { canonical: "/terms" } };

export default function Terms() {
  const l = copy.legal.terms;
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
      <h1 className="font-display text-5xl font-bold">{l.title}</h1>
      <p className="mt-3 text-sm text-coral">{l.updated}</p>
      <div className="mt-8 space-y-4 text-lg text-mute">
        {l.body.map((s) => (
          <p key={s}>{s}</p>
        ))}
      </div>
    </div>
  );
}
