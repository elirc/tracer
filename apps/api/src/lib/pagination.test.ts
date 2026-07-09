import { describe, it, expect } from "vitest";
import { encodeCursor, decodeCursor, toPage } from "./pagination";

describe("cursor pagination", () => {
  it("round-trips a cursor", () => {
    const c = { createdAt: "2026-07-09T12:00:00.000Z", id: "abc" };
    expect(decodeCursor(encodeCursor(c))).toEqual(c);
  });

  it("returns null for a garbage cursor (never throws)", () => {
    expect(decodeCursor("not-a-real-cursor!!!")).toBeNull();
    expect(decodeCursor(undefined)).toBeNull();
  });

  it("toPage splits the extra row and emits nextCursor only when there is more", () => {
    const rows = Array.from({ length: 4 }, (_, i) => ({
      id: `id${i}`,
      createdAt: new Date(2026, 0, i + 1),
    }));
    const page = toPage(rows, 3);
    expect(page.items).toHaveLength(3);
    expect(page.nextCursor).not.toBeNull();

    const lastPage = toPage(rows.slice(0, 2), 3);
    expect(lastPage.items).toHaveLength(2);
    expect(lastPage.nextCursor).toBeNull();
  });
});
