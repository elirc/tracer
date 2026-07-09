import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { percentile, summarize, withinSlo } from "./latency";

describe("percentile (nearest-rank)", () => {
  it("empty sample is 0", () => {
    expect(percentile([], 0.95)).toBe(0);
  });

  it("p50/p95/p100 on a known ramp", () => {
    const s = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(percentile(s, 0.5)).toBe(5); // ceil(0.5*10)=5 -> 5th value
    expect(percentile(s, 0.95)).toBe(10); // ceil(0.95*10)=10
    expect(percentile(s, 1)).toBe(10);
  });

  it("does not mutate the caller's buffer", () => {
    const s = [5, 3, 1, 4, 2];
    const copy = [...s];
    percentile(s, 0.9);
    expect(s).toEqual(copy);
  });

  it("property: percentile is bounded by min and max of the sample", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 10_000 }), { minLength: 1 }),
        fc.float({ min: 0, max: 1, noNaN: true }),
        (samples, q) => {
          const p = percentile(samples, q);
          return p >= Math.min(...samples) && p <= Math.max(...samples);
        },
      ),
    );
  });

  it("property: percentiles are monotonic non-decreasing in q", () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: 0, max: 1000 }), { minLength: 1 }), (samples) => {
        return percentile(samples, 0.5) <= percentile(samples, 0.95) &&
          percentile(samples, 0.95) <= percentile(samples, 0.99);
      }),
    );
  });
});

describe("summarize + SLO", () => {
  it("summarize reports count and ordered percentiles", () => {
    const s = summarize([10, 20, 30, 40, 50]);
    expect(s.count).toBe(5);
    expect(s.p50).toBeLessThanOrEqual(s.p95);
    expect(s.max).toBe(50);
  });

  it("empty sample is within any SLO (no budget spent)", () => {
    expect(withinSlo([], 500)).toBe(true);
  });

  it("a fat tail can violate the SLO even when the mean looks healthy", () => {
    // 90 fast + 10 slow: p95 (nearest-rank position 95 of 100) lands in the slow region -> 2000ms,
    // so the SLO is violated. But the mean is (90*50 + 10*2000)/100 = 245ms, comfortably "under 500"
    // — which is exactly why you never phrase a latency SLO against the average.
    const mostlyFast = [...Array(90).fill(50), ...Array(10).fill(2000)];
    expect(withinSlo(mostlyFast, 500)).toBe(false);
    const mean = mostlyFast.reduce((a, b) => a + b, 0) / mostlyFast.length;
    expect(mean).toBeLessThan(500); // the average would have lied
  });
});
