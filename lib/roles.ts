// Account types: what a person says they are when they register. One list used by sign in (role in the link) and onboarding.
// A role is a label the person chose. It is NOT a permission: it grants no access to anyone's data, and nothing in the app
// authorizes anything from it (user metadata can be edited by the user; access comes from row level security and entitlements).
// Only types with a real flow today are listed. Partner is an organization account, separate from player accounts, and is
// registered in the Partner platform (docs/partner on PR #42), not here.
export const ROLES = [
  { id: "player", title: "Player", line: "Build your Player Resume.", destination: "/dashboard", game: true, soon: false },
  { id: "team", title: "Coach or team", line: "Run your roster in one place.", destination: "/dashboard/team", game: true, soon: false },
  { id: "recruiter", title: "Scout or recruiter", line: "Find players who choose to be found.", destination: "/dashboard/scout", game: false, soon: true },
] as const;

export type RoleId = (typeof ROLES)[number]["id"];
export const ROLE_IDS = ROLES.map((r) => r.id) as [RoleId, ...RoleId[]];
export const isRole = (v: unknown): v is RoleId => typeof v === "string" && (ROLE_IDS as string[]).includes(v);
export const getRole = (v: unknown) => ROLES.find((r) => r.id === v) ?? null;

/**
 * The groups shown on the marketing homepage and where each one starts. Players, teams and scouts register on the app with
 * their role. College programs run rosters, so they register as a coach or team. Partner organizations learn about and
 * start Partner registration from the Partnerships page.
 */
export const AUDIENCES = [
  { id: "player", title: "Player", line: "Build your Player Resume.", soon: false, to: "app:/login?role=player", cta: "Get started" },
  { id: "team", title: "Coach or team", line: "Run your roster in one place.", soon: false, to: "app:/login?role=team", cta: "Get started" },
  { id: "recruiter", title: "Scout or recruiter", line: "Find players who choose to be found.", soon: true, to: "app:/login?role=recruiter", cta: "Get started" },
  { id: "college", title: "College program", line: "Run your program's rosters.", soon: false, to: "app:/login?role=team", cta: "Get started" },
  { id: "partner", title: "Partner organization", line: "Support players and programs.", soon: false, to: "/partnerships", cta: "Learn more" },
] as const;
