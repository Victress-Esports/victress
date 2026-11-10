// The groups Victress serves. One list used by the marketing site (who are you?), sign in (role in the link) and onboarding.
// A role records what the person said they are. It is not a permission: it grants no access to anyone's data.
// `soon` is true while the role's own experience is not built: the account is created and saved, nothing more is promised.
export const ROLES = [
  { id: "player", title: "Player", line: "Build your Player Resume.", destination: "/dashboard", game: true, soon: false },
  { id: "team", title: "Coach or team", line: "Run your roster in one place.", destination: "/dashboard/team", game: true, soon: false },
  { id: "recruiter", title: "Scout or recruiter", line: "Find players who choose to be found.", destination: "/dashboard/scout", game: false, soon: true },
  { id: "college", title: "College program", line: "Bring your program onto Victress.", destination: "/dashboard", game: false, soon: true },
  { id: "partner", title: "Partner organization", line: "Support players and programs.", destination: "/dashboard", game: false, soon: true },
] as const;

export type RoleId = (typeof ROLES)[number]["id"];
export const ROLE_IDS = ROLES.map((r) => r.id) as [RoleId, ...RoleId[]];
export const isRole = (v: unknown): v is RoleId => typeof v === "string" && (ROLE_IDS as string[]).includes(v);
export const getRole = (v: unknown) => ROLES.find((r) => r.id === v) ?? null;
