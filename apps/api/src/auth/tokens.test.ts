import { describe, it, expect } from "vitest";
import { randomToken, hashToken } from "./tokens";

describe("tokens", () => {
  it("random tokens are unique and URL-safe", () => {
    const a = randomToken();
    const b = randomToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("hashing is deterministic and one-way (different length than input)", () => {
    const t = randomToken();
    expect(hashToken(t)).toBe(hashToken(t));
    expect(hashToken(t)).not.toBe(t);
    expect(hashToken(t)).toHaveLength(64); // sha256 hex
  });
});
