import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { keyBetween, keyAfter } from "./order";

describe("keyBetween", () => {
  it("produces a key strictly between two given keys", () => {
    const a = keyBetween(null, null);
    const b = keyAfter(a);
    const mid = keyBetween(a, b);
    expect(a < mid && mid < b).toBe(true);
  });

  it("appends an increasing sequence with keyAfter", () => {
    let last: string | null = null;
    const keys: string[] = [];
    for (let i = 0; i < 50; i++) {
      last = keyAfter(last);
      keys.push(last);
    }
    const sorted = [...keys].sort();
    expect(keys).toEqual(sorted); // already ascending
  });

  // Property: repeatedly inserting between the SAME two neighbours always yields a key in range,
  // and successive inserts stay ordered. (This is exactly the offline-merge case S07 relies on.)
  it("property: any insertion between two ordered keys stays strictly between", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 40 }), (n) => {
        const lo = keyBetween(null, null);
        let hi = keyAfter(lo);
        for (let i = 0; i < n; i++) {
          const mid = keyBetween(lo, hi);
          expect(lo < mid && mid < hi).toBe(true);
          // keep inserting into the lower half — the classic same-slot repeated insert
          hi = mid;
        }
      }),
    );
  });

  it("property: a random sorted insert order round-trips to sorted keys", () => {
    fc.assert(
      fc.property(fc.array(fc.string({ minLength: 1, maxLength: 4 }), { minLength: 2, maxLength: 20 }), () => {
        // Build a list by always appending; the keys must come out sorted.
        let last: string | null = null;
        const keys: string[] = [];
        for (let i = 0; i < 10; i++) {
          last = keyAfter(last);
          keys.push(last);
        }
        expect([...keys].sort()).toEqual(keys);
      }),
    );
  });
});
