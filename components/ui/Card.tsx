import type { ComponentPropsWithRef, ElementType } from "react";

/** The one card shell for the marketing site: flat surface, hairline border, no shadow or glow. */
export function Card<T extends ElementType = "div">({
  as,
  className = "",
  padded = true,
  ...props
}: { as?: T; className?: string; padded?: boolean } & Omit<ComponentPropsWithRef<T>, "as" | "className">) {
  const Tag: ElementType = as ?? "div";
  return <Tag {...props} className={`rounded-2xl border border-line bg-surface ${padded ? "p-6 sm:p-8" : ""} ${className}`} />;
}
