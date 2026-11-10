// One place to edit plans and prices. Billing stays off until NEXT_PUBLIC_BILLING_ENABLED=true.
export type WaitlistInterest = "pro" | "team" | "scout" | "scrims";

export interface Plan {
  id: "rookie" | "pro" | "team" | "scout";
  name: string;
  /** Monthly price in USD. */
  monthly: number;
  /** Yearly price in USD, if offered. */
  yearly?: number;
  /** Shown after the price, e.g. "forever" or "per roster". */
  unit: string;
  /** Approved plan descriptions (kept verbatim). Paid plans are marked Coming soon until they are built. */
  blurb: string;
  note?: string;
  live: boolean;
  interest?: WaitlistInterest;
  highlight?: boolean;
}

export const PLANS: Plan[] = [
  {
    id: "rookie",
    name: "Rookie",
    monthly: 0,
    unit: "forever",
    blurb:
      "Your competitive profile starts here. Track your stats, share your progress, and build your presence in esports.",
    live: true,
  },
  {
    id: "pro",
    name: "Pro",
    monthly: 7.99,
    yearly: 75,
    unit: "per month",
    blurb:
      "A clearer view of your performance. Track your progress, build your player profile, and share it with teams.",
    live: false,
    interest: "pro",
    highlight: true,
  },
  {
    id: "team",
    name: "Team",
    monthly: 49,
    unit: "per month",
    blurb:
      "Everything your roster needs in one place. Manage players, follow team progress, and keep your program organized.",
    live: false,
    interest: "team",
  },
  {
    id: "scout",
    name: "Scout",
    monthly: 249,
    unit: "per month",
    blurb:
      "Find the right players. Explore competitive profiles, compare performance, and organize recruitment prospects.",
    live: false,
    interest: "scout",
  },
];

export const formatUsd = (n: number) => (n === 0 ? "$0" : `$${Number.isInteger(n) ? n : n.toFixed(2)}`);

/**
 * Shown to buyers before they pay for Scout (pricing page and /settings/billing), only while billing is on. Founder wording, 2026-11-10.
 * PENDING the founder's approval of the final wording: billing must not be enabled on Production until he approves it.
 */
export const SCOUT_BUYER_NOTE = "Scout, $249/month. Your account is set up as a Scout. Scout Desk access opens to Scout accounts when it launches.";
