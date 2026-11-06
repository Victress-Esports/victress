import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "ghost";

const base =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 text-base font-semibold transition-colors disabled:opacity-60";
const variants: Record<Variant, string> = {
  primary: "bg-crimson text-white hover:bg-signal hover:text-carbon active:bg-signal",
  secondary: "border border-line bg-surface text-white hover:border-white",
  ghost: "text-white hover:text-coral",
};

export const buttonClass = (variant: Variant = "primary", extra = "") => `${base} ${variants[variant]} ${extra}`;

export function ButtonLink({ variant = "primary", className = "", ...props }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link {...props} className={buttonClass(variant, className)} />;
}

export function Button({ variant = "primary", className = "", ...props }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button {...props} className={buttonClass(variant, className)} />;
}
