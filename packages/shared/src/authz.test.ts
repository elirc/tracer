import { describe, it, expect } from "vitest";
import { canAccessTeam, isAdmin, visibleTeamIds, type MembershipView } from "./authz";

const admin: MembershipView = { role: "ADMIN", guestTeamIds: [] };
const member: MembershipView = { role: "MEMBER", guestTeamIds: [] };
const guest: MembershipView = { role: "GUEST", guestTeamIds: ["team_eng"] };

describe("authz matrix", () => {
  it("ADMIN and MEMBER can access any team", () => {
    expect(canAccessTeam(admin, "team_eng")).toBe(true);
    expect(canAccessTeam(admin, "team_design")).toBe(true);
    expect(canAccessTeam(member, "team_design")).toBe(true);
  });

  it("GUEST can access only granted teams", () => {
    expect(canAccessTeam(guest, "team_eng")).toBe(true);
    expect(canAccessTeam(guest, "team_design")).toBe(false);
  });

  it("only ADMIN is admin", () => {
    expect(isAdmin(admin)).toBe(true);
    expect(isAdmin(member)).toBe(false);
    expect(isAdmin(guest)).toBe(false);
  });

  it("visibleTeamIds narrows for guests, passes through for others", () => {
    const all = ["team_eng", "team_design", "team_ops"];
    expect(visibleTeamIds(admin, all)).toEqual(all);
    expect(visibleTeamIds(guest, all)).toEqual(["team_eng"]);
  });
});
