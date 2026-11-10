// PAGE ONLY data for /partnerships (victressesports.com): the Partner plans, benefits and section copy, copied from the approved Partner
// entitlements config (docs/partner/partner-build-brief.md, founder approved 2026-11-09 and 2026-11-10) so this page can ship on its own.
// TODO: when the Partner launch merges, DELETE this file and import the same names from content/partner-entitlements.ts and content/partner.ts
// (PARTNER_PLANS, isComing, marketingText, CHALLENGE_AREAS, IMPACT_CATEGORIES, WAYS). Do not edit plans, prices or benefits here; change them in the
// entitlements config. Approved wording is kept exactly. The two or three benefits that contain a hyphen carry a marketingLabel without it,
// because victressesports.com has a no hyphens rule. Status: "implemented" works today; "in_development" and "planned" are not built and show Coming soon.

export type PartnerPlanId = "community" | "supporting" | "anchor" | "anchor_exclusive";
export type BenefitStatus = "implemented" | "in_development" | "planned";

export interface Benefit {
  id: string;
  /** The approved wording, verbatim. */
  label: string;
  /** The same words without a hyphen, for victressesports.com. */
  marketingLabel?: string;
  status: BenefitStatus;
}

export interface PartnerPlan {
  id: PartnerPlanId;
  name: string;
  price: string;
  priceLine: string;
  /** The plan whose benefits this plan includes in full. */
  includes: PartnerPlanId | null;
  /** Benefits this plan adds. */
  benefits: Benefit[];
}

export const PARTNER_PLANS: PartnerPlan[] = [
  {
    id: "community",
    name: "Community Partner",
    price: "$0",
    priceLine: "Free",
    includes: null,
    benefits: [
      { id: "community_join", label: "Join the partner community", status: "implemented" },
      { id: "community_discover", label: "Discover initiatives", status: "implemented" },
      { id: "community_share", label: "Share opportunities", status: "implemented" },
      { id: "community_contribute", label: "Contribute resources and expertise", status: "implemented" },
    ],
  },
  {
    id: "supporting",
    name: "Supporting Partner",
    price: "$1,000",
    priceLine: "per month, or $10,000 per year",
    includes: "community",
    benefits: [
      { id: "supporting_subsidize", label: "Direct subsidization of Scrim Intelligence access for developing rosters", status: "planned" },
      { id: "supporting_tracking", label: "Tracking of supported teams and program milestones", status: "in_development" },
      { id: "supporting_reports", label: "Quarterly impact reports for ESG and DEI review", status: "in_development" },
      { id: "supporting_scout_seats", label: "2 Scout Desk evaluator seats for talent identification", status: "planned" },
      { id: "supporting_offer_support", label: "Offer Support on published opportunities", status: "implemented" },
      { id: "supporting_csv", label: "A downloadable impact report (CSV)", status: "implemented" },
    ],
  },
  {
    id: "anchor",
    name: "Anchor Partner",
    price: "$50,000",
    priceLine: "per year",
    includes: "supporting",
    benefits: [
      { id: "anchor_integration", label: "Platform-wide integration across the Victress network", marketingLabel: "Platform wide integration across the Victress network", status: "planned" },
      { id: "anchor_analytics", label: "ESG and Shared Value analytics suite", status: "planned" },
      { id: "anchor_scout_seats", label: "10 Scout Desk seats with priority access to opt-in talent pipelines", marketingLabel: "10 Scout Desk seats with priority access to opt in talent pipelines", status: "planned" },
      { id: "anchor_pr", label: "Co-developed public impact features and joint PR rights", marketingLabel: "Codeveloped public impact features and joint PR rights", status: "planned" },
      { id: "anchor_initiatives", label: "Initiatives developed together with the Victress team", status: "planned" },
      { id: "anchor_request_exclusivity", label: "Request Category Exclusivity", status: "implemented" },
    ],
  },
  {
    id: "anchor_exclusive",
    name: "Anchor Partner with Category Exclusivity",
    price: "$85,000",
    priceLine: "per year",
    includes: "anchor",
    benefits: [
      { id: "exclusive_rights", label: "Exclusive rights within an agreed category across platform-wide events and initiatives", marketingLabel: "Exclusive rights within an agreed category across platform wide events and initiatives", status: "in_development" },
      { id: "exclusive_research", label: "Custom research reports", status: "planned" },
      { id: "exclusive_advisory", label: "Direct co-investment advisory", marketingLabel: "Direct co investment advisory", status: "planned" },
    ],
  },
];

/** victressesports.com: an unbuilt benefit carries one plain "Coming soon" label and nothing else about status (founder decision, 2026-11-07). */
export const isComing = (b: Benefit) => b.status !== "implemented";
export const marketingText = (b: Benefit) => b.marketingLabel ?? b.label;

// The sample dashboard on the page uses these section names (Partner Experience specification, section 3).
export const CHALLENGE_AREAS = [
  { id: "participation", label: "Participation" },
  { id: "development", label: "Development" },
  { id: "representation", label: "Representation" },
  { id: "resources", label: "Resources" },
  { id: "safety", label: "Safety" },
  { id: "competitive_pathways", label: "Competitive Pathways" },
] as const;

export const WAYS = [
  { id: "resources", label: "Resources" },
  { id: "expertise_mentorship", label: "Expertise & Mentorship" },
  { id: "infrastructure", label: "Infrastructure" },
  { id: "opportunities", label: "Opportunities" },
] as const;

export const IMPACT_CATEGORIES = [
  { id: "resources_provided", label: "Resources Provided" },
  { id: "teams_supported", label: "Teams Supported" },
  { id: "player_development", label: "Player Development" },
  { id: "mentorship_education", label: "Mentorship & Education" },
  { id: "competitive_opportunities", label: "Competitive Opportunities" },
  { id: "career_progression", label: "Career Progression" },
  { id: "community_participation", label: "Community Participation" },
] as const;
