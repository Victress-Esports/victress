// Partner account: the one place for names, plans and wording. Partner is an account type for organizations.
// Creating Shared Value is the strategy. Women in Esports is the commitment. Nothing here claims a partner, program, outcome
// or integration that does not exist. Copy has no hyphens or em dashes.

/** Version of the Terms an organization accepts at signup (the "Effective November 7, 2026" Terms, content/legal.ts). Stored with a timestamp. */
export const PARTNER_TERMS_VERSION = "terms-2026-11-07";

// Plans, prices, benefits and their statuses live in content/partner-entitlements.ts (one central configuration).
export * from "@/content/partner-entitlements";

export const ORG_TYPES = [
  { id: "university", label: "University" },
  { id: "company", label: "Company" },
  { id: "esports_organization", label: "Esports organization" },
  { id: "league", label: "League" },
  { id: "community_group", label: "Community group" },
  { id: "nonprofit", label: "Nonprofit" },
] as const;
export type OrgType = (typeof ORG_TYPES)[number]["id"];
export const ORG_TYPE_IDS = ORG_TYPES.map((t) => t.id) as [OrgType, ...OrgType[]];
export const orgTypeLabel = (id: string) => ORG_TYPES.find((t) => t.id === id)?.label ?? id;

// ---------------------------------------------------------------- navigation

export const PARTNER_NAV = [
  { href: "/dashboard/partner", label: "Overview" },
  { href: "/dashboard/partner/challenges", label: "Challenges" },
  { href: "/dashboard/partner/participation", label: "Participation" },
  { href: "/dashboard/partner/opportunities", label: "Opportunities" },
  { href: "/dashboard/partner/impact", label: "Impact" },
  { href: "/dashboard/partner/settings", label: "Organization Settings" },
] as const;

export const PARTNER_SECTION_LINES = {
  challenges: "Understand what needs to change.",
  participation: "Decide how to contribute.",
  opportunities: "Find where to get involved.",
  impact: "See what your involvement accomplishes.",
} as const;

// ---------------------------------------------------------------- challenges

export const CHALLENGE_AREAS = [
  { id: "participation", label: "Participation", line: "Who is able to enter and stay in competitive esports, and what stops them." },
  { id: "development", label: "Development", line: "Access to practice, feedback and the information players need to improve." },
  { id: "representation", label: "Representation", line: "How visible women competitors are, and whether their achievements are recognized." },
  { id: "resources", label: "Resources", line: "Gaps in equipment, software, travel, tournament entry and other support." },
  { id: "safety", label: "Safety", line: "Harassment, privacy and the conditions that keep players in or push them out." },
  { id: "competitive_pathways", label: "Competitive Pathways", line: "How players move from practice to teams, collegiate programs and opportunity." },
] as const;
export type ChallengeArea = (typeof CHALLENGE_AREAS)[number]["id"];
export const areaLabel = (id: string) => CHALLENGE_AREAS.find((a) => a.id === id)?.label ?? id;

// ---------------------------------------------------------------- participation

export const WAYS = [
  { id: "resources", label: "Resources", line: "Fund software access, equipment, travel, tournament entry or other resources." },
  { id: "expertise_mentorship", label: "Expertise & Mentorship", line: "Provide professional expertise, coaching, workshops and mentorship." },
  { id: "infrastructure", label: "Infrastructure", line: "Provide facilities, equipment, technology and competitive resources." },
  { id: "opportunities", label: "Opportunities", line: "Provide scholarships, internships, tryouts and career pathways." },
] as const;
export type Way = (typeof WAYS)[number]["id"];
export const WAY_IDS = WAYS.map((w) => w.id) as [Way, ...Way[]];
export const wayLabel = (id: string) => WAYS.find((w) => w.id === id)?.label ?? id;

export const REVIEW_STATUS_LABEL: Record<string, string> = {
  submitted: "Submitted",
  in_review: "In review",
  accepted: "Accepted",
  declined: "Not taken forward",
  published: "Published",
  closed: "Closed",
};
export const statusLabel = (s: string) => REVIEW_STATUS_LABEL[s] ?? s;

// ---------------------------------------------------------------- opportunities

export const OPPORTUNITY_TYPES = [
  { id: "team_development", label: "Team Development" },
  { id: "tournament_support", label: "Tournament Support" },
  { id: "collegiate_programs", label: "Collegiate Programs" },
  { id: "scholarships", label: "Scholarships" },
  { id: "mentorship_programs", label: "Mentorship Programs" },
  { id: "community_initiatives", label: "Community Initiatives" },
  { id: "career_opportunities", label: "Career Opportunities" },
] as const;
export type OpportunityType = (typeof OPPORTUNITY_TYPES)[number]["id"];
export const OPPORTUNITY_TYPE_IDS = OPPORTUNITY_TYPES.map((t) => t.id) as [OpportunityType, ...OpportunityType[]];
export const opportunityTypeLabel = (id: string) => OPPORTUNITY_TYPES.find((t) => t.id === id)?.label ?? id;

// ---------------------------------------------------------------- impact

export const IMPACT_CATEGORIES = [
  { id: "resources_provided", label: "Resources Provided" },
  { id: "teams_supported", label: "Teams Supported" },
  { id: "player_development", label: "Player Development" },
  { id: "mentorship_education", label: "Mentorship & Education" },
  { id: "competitive_opportunities", label: "Competitive Opportunities" },
  { id: "career_progression", label: "Career Progression" },
  { id: "community_participation", label: "Community Participation" },
] as const;
export const impactLabel = (id: string) => IMPACT_CATEGORIES.find((c) => c.id === id)?.label ?? id;

export const IMPACT_ATTRIBUTION =
  "Impact records report what happened after an organization took part. They do not say that the organization caused an outcome. Victress writes each record and does not yet measure every category.";

// ---------------------------------------------------------------- verification

export const VERIFICATION_NOTE =
  "Verification means Victress confirmed who the organization is and that its representative is authorized to act for it. It does not mean Victress endorses the organization or guarantees any outcome. Payment is not verification.";
