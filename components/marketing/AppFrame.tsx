import type { ReactNode } from "react";
import { SampleTag, SoonTag } from "@/components/marketing/SampleTag";

/**
 * A plain window around a sample of the product. It always says Sample; unbuilt features also say Coming soon.
 * `route` is where the real screen lives (or will live) on the application, so the sample reads as a preview of that page.
 */
export function AppFrame({
  route,
  soon = false,
  label,
  children,
}: {
  route: string;
  soon?: boolean;
  label: string;
  children: ReactNode;
}) {
  return (
    <figure
      aria-label={label}
      className="w-full max-w-md overflow-hidden rounded-2xl border border-line bg-surface"
    >
      <figcaption className="flex items-center justify-between gap-3 border-b border-line bg-carbon/60 px-4 py-2.5">
        <span className="truncate text-xs text-mute">{route}</span>
        <span className="flex shrink-0 gap-2">
          <SampleTag />
          {soon ? <SoonTag /> : null}
        </span>
      </figcaption>
      <div className="p-5 sm:p-6">{children}</div>
    </figure>
  );
}
