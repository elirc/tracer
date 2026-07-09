import { describe, it, expect } from "vitest";
import { fuzzyMatch } from "./fuzzy";

describe("fuzzyMatch", () => {
  it("matches a subsequence and rejects a non-subsequence", () => {
    expect(fuzzyMatch("ws", "workspace")).not.toBeNull();
    expect(fuzzyMatch("zzz", "workspace")).toBeNull();
  });

  it("scores word-boundary matches higher than mid-word", () => {
    const boundary = fuzzyMatch("gh", "GitHub sync")!; // g + h at word starts
    const midword = fuzzyMatch("gh", "laughing")!; // g,h inside a word
    expect(boundary.score).toBeGreaterThan(midword.score);
  });

  it("scores a consecutive run higher than scattered matches (no boundary confound)", () => {
    const run = fuzzyMatch("abc", "abcxyz")!; // consecutive
    const scattered = fuzzyMatch("abc", "axbxcx")!; // same chars, spread out, no word boundaries
    expect(run.score).toBeGreaterThan(scattered.score);
  });

  it("returns matched indices for highlighting", () => {
    const m = fuzzyMatch("ac", "acme")!;
    expect(m.indices).toEqual([0, 1]);
  });
});
