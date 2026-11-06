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
  /** Plan description. Only describe what exists, or what is clearly marked Coming soon. */
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
    blurb: "Your competitive profile starts here.",
    live: true,
  },
  {
    id: "pro",
    name: "Pro",
    monthly: 7.99,
    yearly: 75,
    unit: "per month",
    blurb: "A clearer view of your performance.",
    live: false,
    interest: "pro",
    highlight: true,
  },
  {
    id: "team",
    name: "Team",
    monthly: 49,
    unit: "per month",
    blurb: "Everything your roster needs in one place.",
    note: "First season free for founding clubs.",
    live: false,
    interest: "team",
  },
  {
    id: "scout",
    name: "Scout",
    monthly: 249,
    unit: "per month",
    blurb: "Find the right players.",
    live: false,
    interest: "scout",
  },
];

export const formatUsd = (n: number) => (n === 0 ? "$0" : `$${Number.isInteger(n) ? n : n.toFixed(2)}`);
