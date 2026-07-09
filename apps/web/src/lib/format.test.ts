import { describe, it, expect } from "vitest";
import { workspaceLabel } from "./format";

describe("workspaceLabel", () => {
  it("formats name and slug", () => {
    expect(
      workspaceLabel({
        id: "1",
        name: "Acme",
        slug: "acme",
        createdAt: new Date().toISOString(),
      }),
    ).toBe("Acme (acme)");
  });
});
