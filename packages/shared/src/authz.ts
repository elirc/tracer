export type Role = "ADMIN" | "MEMBER" | "GUEST";

export interface MembershipView {
  role: Role;
  /** For GUEST: the team ids this member may access. Ignored for ADMIN/MEMBER. */
  guestTeamIds: string[];
}

/**
 * The authorization spine. Kept as pure functions so the whole role matrix is unit-testable
 * without a database — the route guards (api) are thin wrappers over these decisions.
 *
 * Rule: ADMIN and MEMBER see every team in the workspace; a GUEST sees only the teams in
 * their `guestTeamIds`. Every issue-domain query in later sprints must pass through this.
 */
export function canAccessTeam(m: MembershipView, teamId: string): boolean {
  if (m.role === "ADMIN" || m.role === "MEMBER") return true;
  return m.guestTeamIds.includes(teamId);
}

/** Admin-only actions (managing members, workspace settings, invites). */
export function isAdmin(m: MembershipView): boolean {
  return m.role === "ADMIN";
}

/** Narrow a set of team ids to the ones this member may see. */
export function visibleTeamIds(m: MembershipView, allTeamIds: string[]): string[] {
  if (m.role === "ADMIN" || m.role === "MEMBER") return allTeamIds;
  return allTeamIds.filter((id) => m.guestTeamIds.includes(id));
}
