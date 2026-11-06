import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-md flex-col items-start justify-center gap-4 px-4">
      <p className="tnum font-display text-7xl font-bold text-crimson">404</p>
      <h1 className="font-display text-3xl font-bold">Page not found.</h1>
      <Link href="/" className={buttonClass("primary", "mt-2")}>
        Go home
      </Link>
    </main>
  );
}
