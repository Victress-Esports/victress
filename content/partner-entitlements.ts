// Partner plans and entitlements: the one place for what each plan includes and what is built.
// Source: docs/partner/partner-build-brief.md (founder approved, 2026-11-09). Plans, prices and benefits are approved business decisions:
// do not remove, reword or reinterpret one because it is not built yet. Give it a status instead (CLAUDE.md, section 8).
//
// Status: "implemented" works today. "in_development" is partly built or being built. "planned" is not built yet.
// A benefit may carry a `capability`. Only a benefit that is implemented may enforce one, and pages and server actions ask
// can(plan, capability) here instead of checking plan names themselves.
//
// Copy has no hyphens or em dashes on victressesports.com. Where an approved benefit contains a hyphen, `marketingLabel` is the same
// words without it. victress.gg shows `label` exactly as approved.

export type PartnerPlanId = "community" | "supporting" | "anchor" | "anchor_exclusive";
/** The plans a person can start from the signup form. Exclusivity is requested later by an Anchor Partner. */
export type SignupPlanId = Exclude<PartnerPlanId, "anchor_exclusive">;
export type PartnerInterval = "monthly" | "annual";
export type BenefitStatus = "implemented" | "in_development" | "planned";

/** What a page or action may ask. Add a capability here only together with the server side check that enforces it. */
export type Capability = "offer_support" | "impact_report_csv" | "request_exclusivity";

export interface Benefit {
  id: string;
  /** The approved wording, verbatim. */
  label: string;
  marketingLabel?: string;
  status: BenefitStatus;
  /** Plain statement of what exists today. Shown to the organization on victress.gg. */
  note?: string;
  capability?: Capability;
  /** Earlier approved wording this benefit replaces or continues. Kept so nothing approved is dropped. */
  earlierWording?: string;
}

export interface PartnerPlan {
  id: PartnerPlanId;
  name: string;
  price: string;
  priceLine: string;
  intervals: PartnerInterval[];
  /** The plan whose benefits this plan includes in full. */
  includes: PartnerPlanId | null;
  /** Benefits this plan adds. The full list for a plan is its own plus those of every plan it includes. */
  benefits: Benefit[];
  /** How the plan is bought. */
  purchase: "free" | "checkout" | "checkout_or_invoice" | "request_then_invoice";
}

export const PARTNER_PLANS: PartnerPlan[] = [
  {
    id: "community",
    name: "Community Partner",
    price: "$0",
    priceLine: "Free",
    intervals: [],
    includes: null,
    purchase: "free",
    benefits: [
      { id: "community_join", label: "Join the partner community", status: "implemented", note: "Create an organization account without payment details.", earlierWording: "All five Partner sections" },
      { id: "community_discover", label: "Discover initiatives", status: "implemented", note: "Challenges, Participation and published Opportunities." },
      { id: "community_share", label: "Share opportunities", status: "implemented", note: "Submit an opportunity. It stays in review until Victress publishes it.", earlierWording: "Post opportunities that need support" },
      { id: "community_contribute", label: "Contribute resources and expertise", status: "implemented", note: "Submit ways to participate and see their status.", earlierWording: "Submit ways to participate" },
    ],
  },
  {
    id: "supporting",
    name: "Supporting Partner",
    price: "$1,000",
    priceLine: "per month, or $10,000 per year",
    intervals: ["monthly", "annual"],
    includes: "community",
    purchase: "checkout",
    benefits: [
      { id: "supporting_subsidize", label: "Direct subsidization of Scrim Intelligence access for developing rosters", status: "planned", note: "Scrim Intelligence analysis is not built yet." },
      { id: "supporting_tracking", label: "Tracking of supported teams and program milestones", status: "in_development", note: "Victress records what happened under Impact today. Tracking by team and milestone is not built yet." },
      { id: "supporting_reports", label: "Quarterly impact reports for ESG and DEI review", status: "in_development", note: "A downloadable impact report (CSV) works today. Quarterly reports are not generated yet." },
      { id: "supporting_scout_seats", label: "2 Scout Desk evaluator seats for talent identification", status: "planned", note: "Scout Desk is not built. Seats will see only players who opted in, and never minors." },
      { id: "supporting_offer_support", label: "Offer Support on published opportunities", status: "implemented", capability: "offer_support", note: "Paid and active plans only, on other organizations' published opportunities." },
      { id: "supporting_csv", label: "A downloadable impact report (CSV)", status: "implemented", capability: "impact_report_csv", note: "Your participation, opportunities, support offers and impact records." },
    ],
  },
  {
    id: "anchor",
    name: "Anchor Partner",
    price: "$50,000",
    priceLine: "per year",
    intervals: ["annual"],
    includes: "supporting",
    purchase: "checkout_or_invoice",
    benefits: [
      { id: "anchor_integration", label: "Platform-wide integration across the Victress network", marketingLabel: "Platform wide integration across the Victress network", status: "planned" },
      { id: "anchor_analytics", label: "ESG and Shared Value analytics suite", status: "planned" },
      { id: "anchor_scout_seats", label: "10 Scout Desk seats with priority access to opt-in talent pipelines", marketingLabel: "10 Scout Desk seats with priority access to opt in talent pipelines", status: "planned", note: "Scout Desk is not built. Opt-in players only, never minors." },
      { id: "anchor_pr", label: "Co-developed public impact features and joint PR rights", marketingLabel: "Codeveloped public impact features and joint PR rights", status: "planned" },
      { id: "anchor_initiatives", label: "Initiatives developed together with the Victress team", status: "planned", earlierWording: "Initiatives planned with the Victress team" },
      { id: "anchor_request_exclusivity", label: "Request Category Exclusivity", status: "implemented", capability: "request_exclusivity", note: "Request a category in Organization Settings. Victress approves it, then you pay by Stripe invoice." },
    ],
  },
  {
    id: "anchor_exclusive",
    name: "Anchor Partner with Category Exclusivity",
    price: "$85,000",
    priceLine: "per year",
    intervals: ["annual"],
    includes: "anchor",
    purchase: "request_then_invoice",
    benefits: [
      { id: "exclusive_rights", label: "Exclusive rights within an agreed category across platform-wide events and initiatives", marketingLabel: "Exclusive rights within an agreed category across platform wide events and initiatives", status: "in_development", note: "Requesting, approving and reserving a category is built, so the same category is never sold twice. The rights themselves are applied through the agreement." },
      { id: "exclusive_research", label: "Custom research reports", status: "planned" },
      { id: "exclusive_advisory", label: "Direct co-investment advisory", marketingLabel: "Direct co investment advisory", status: "planned" },
    ],
  },
];

export const PLAN_IDS = PARTNER_PLANS.map((p) => p.id) as [PartnerPlanId, ...PartnerPlanId[]];
export const SIGNUP_PLANS = PARTNER_PLANS.filter((p) => p.id !== "anchor_exclusive") as (PartnerPlan & { id: SignupPlanId })[];

export const planById = (id: string): PartnerPlan => PARTNER_PLANS.find((p) => p.id === id) ?? PARTNER_PLANS[0];
export const planLabel = (id: string) => planById(id).name;
/** Plans that need a confirmed, active subscription. The database stores supporting and anchor; exclusivity is a separate record. */
export const isPaidPlan = (id: string) => id === "supporting" || id === "anchor" || id === "anchor_exclusive";

/** Every benefit of a plan, including those of the plans it includes, lowest plan first. */
export function benefitsFor(id: PartnerPlanId): (Benefit & { from: PartnerPlanId })[] {
  const chain: PartnerPlan[] = [];
  for (let p: PartnerPlan | undefined = planById(id); p; p = p.includes ? planById(p.includes) : undefined) chain.unshift(p);
  return chain.flatMap((p) => p.benefits.map((b) => ({ ...b, from: p.id })));
}

/** True only when the plan includes an implemented benefit that carries the capability. Planned and in development benefits never grant one. */
export const can = (id: PartnerPlanId, capability: Capability) => benefitsFor(id).some((b) => b.capability === capability && b.status === "implemented");

/**
 * The plan whose entitlements apply right now. `paid` mirrors the database rule partner_is_paid(): a paid plan with an active or trialing
 * subscription. A plan that is not paid gets Community entitlements. Exclusivity counts only on a paid Anchor plan and only when
 * the request is active (approved by Victress and paid).
 */
export function effectivePlan(stored: string, paid: boolean, exclusivityActive: boolean): PartnerPlanId {
  if (!paid) return "community";
  if (stored === "anchor") return exclusivityActive ? "anchor_exclusive" : "anchor";
  if (stored === "supporting") return "supporting";
  return "community";
}

export const STATUS_LABEL: Record<BenefitStatus, string> = {
  implemented: "Available",
  in_development: "In development",
  planned: "Planned",
};

/** victressesports.com: an unbuilt benefit carries one plain "Coming soon" label and nothing else about status (founder decision, 2026-11-07). */
export const isComing = (b: Benefit) => b.status !== "implemented";
export const marketingText = (b: Benefit) => b.marketingLabel ?? b.label;
