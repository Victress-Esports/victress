"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/profile", label: "Profile" },
  { href: "/dashboard/stats", label: "Stats" },
  { href: "/dashboard/team", label: "Team" },
  { href: "/leaderboard", label: "Leaderboards" },
];

export function DashboardNav() {
  const path = usePathname() ?? "";
  // usePathname sees the browser URL (not the internal /a rewrite), so these match directly.
  const active = (href: string) => (href === "/dashboard" ? path === href : path === href || path.startsWith(href + "/"));

  return (
    <nav aria-label="Dashboard" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex gap-1">
        {LINKS.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              aria-current={active(l.href) ? "page" : undefined}
              className={`inline-flex min-h-11 items-center whitespace-nowrap rounded-xl px-4 text-sm font-semibold ${
                active(l.href) ? "bg-surface-2 text-white" : "text-mute hover:text-white"
              }`}
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
