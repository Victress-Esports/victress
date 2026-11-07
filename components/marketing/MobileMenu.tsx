"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Item {
  href: string;
  label: string;
}

/** Phone navigation: a button that opens a panel with every page and Log in. Closes on Escape, on a tap, or on a route change. */
export function MobileMenu({ links, login, loginHref, openLabel, closeLabel }: { links: readonly Item[]; login: string; loginHref: string; openLabel: string; closeLabel: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const item = "flex min-h-12 items-center px-4 text-base font-semibold hover:bg-surface-2";
  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? closeLabel : openLabel}
        onClick={() => setOpen((o) => !o)}
        className="grid h-11 w-11 place-items-center rounded-xl border border-line text-white hover:border-white"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          {open ? <path d="M4 4l12 12M16 4L4 16" /> : <path d="M3 6h14M3 10h14M3 14h14" />}
        </svg>
      </button>
      {open ? (
        <nav id="mobile-menu" aria-label="Menu" className="absolute inset-x-0 top-16 z-40 border-b border-line bg-carbon">
          <ul className="mx-auto max-w-6xl py-2">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={() => setOpen(false)} className={item}>
                  {l.label}
                </Link>
              </li>
            ))}
            <li className="border-t border-line">
              <a href={loginHref} className={item}>
                {login}
              </a>
            </li>
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
