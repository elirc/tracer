import { describe, it, expect } from "vitest";
import { WorkspaceSchema, EchoMessageSchema } from "./workspace";

describe("WorkspaceSchema", () => {
  it("accepts a valid workspace", () => {
    const parsed = WorkspaceSchema.parse({
      id: "ws_1",
      name: "Acme",
      slug: "acme",
      createdAt: new Date().toISOString(),
    });
    expect(parsed.slug).toBe("acme");
  });

  it("rejects a non-kebab slug", () => {
    expect(() =>
      WorkspaceSchema.parse({
        id: "ws_1",
        name: "Acme",
        slug: "Acme Inc",
        createdAt: new Date().toISOString(),
      }),
    ).toThrow();
  });
});

describe("EchoMessageSchema", () => {
  it("round-trips an echo message", () => {
    const msg = { type: "echo" as const, payload: "hi", ts: Date.now() };
    expect(EchoMessageSchema.parse(msg)).toEqual(msg);
  });
});
