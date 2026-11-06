import type { ReactNode } from "react";

export const inputClass =
  "min-h-12 w-full rounded-xl border border-line bg-surface px-4 text-white placeholder:text-cool-gray focus-visible:border-white focus-visible:outline-none disabled:opacity-60";

export function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      {children}
      {hint ? <p className="text-sm text-mute">{hint}</p> : null}
    </div>
  );
}

export function Section({ title, line, children }: { title: string; line?: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-line bg-surface p-6">
      <h2 className="font-display text-2xl font-bold">{title}</h2>
      {line ? <p className="mt-1 text-mute">{line}</p> : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

/** Inline result line for forms. Polite live region so screen readers hear it. */
export function FormMessage({ message, ok }: { message: string; ok?: boolean }) {
  return (
    <p role="status" aria-live="polite" className={`min-h-6 text-sm ${ok ? "text-coral" : "text-coral"}`}>
      {message}
    </p>
  );
}
