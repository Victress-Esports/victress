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
  blurb: string;
  features: string[];
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
    blurb: "Everything you need to start.",
    features: ["Shareable player profile", "Manual stat entry", "Public match history"],
    live: true,
  },
  {
    id: "pro",
    name: "Pro",
    monthly: 7.99,
    yearly: 75,
    unit: "per month",
    blurb: "More stats. More insight.",
    features: ["More stats and personal insights", "Priority talent-pool placement"],
    live: false,
    interest: "pro",
    highlight: true,
  },
  {
    id: "team",
    name: "Team",
    monthly: 49,
    unit: "per roster, per month",
    blurb: "For 8 players and 2 coaches.",
    features: ["Team dashboard", "Verified team portfolio"],
    note: "Founding clubs get free access for their first season.",
    live: false,
    interest: "team",
  },
  {
    id: "scout",
    name: "Scout",
    monthly: 249,
    unit: "per month",
    blurb: "For athletic departments and brands.",
    features: ["Built for recruiting and talent discovery"],
    live: false,
    interest: "scout",
  },
];

export const formatUsd = (n: number) => (n === 0 ? "$0" : `$${Number.isInteger(n) ? n : n.toFixed(2)}`);
