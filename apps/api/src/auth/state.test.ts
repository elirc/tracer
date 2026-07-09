import { describe, it, expect } from "vitest";
import { statesMatch } from "./state";

describe("oauth state (login CSRF defense)", () => {
  it("matches identical states", () => {
    expect(statesMatch("abc123", "abc123")).toBe(true);
  });

  it("rejects a forged callback with no cookie state", () => {
    // This is the attack the state param exists to stop: an attacker triggers a callback,
    // but their browser has no matching oauth_state cookie.
    expect(statesMatch(undefined, "attacker-supplied")).toBe(false);
  });

  it("rejects mismatched states", () => {
    expect(statesMatch("real", "tampered")).toBe(false);
  });
});
