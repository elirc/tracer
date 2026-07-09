// Fractional indexing (ADR-0005). An issue's position is a base-62 string key. To move an issue
// we compute a key strictly BETWEEN its new neighbours — a single-row update, no resequencing of
// the rest, and merge-friendly for the sync engine later.
//
// The alphabet is in ascending ASCII order so plain string comparison gives the right order.
const DIGITS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const BASE = DIGITS.length; // 62

function idx(ch: string): number {
  return DIGITS.indexOf(ch);
}

/**
 * A key strictly between `a` and `b` (either may be null for "before first" / "after last").
 * Requires a < b when both are given. Keys can grow in length without bound as you keep inserting
 * between the same two neighbours — see flaw #2 (rebalancing lands in Sprint 12).
 */
export function keyBetween(a: string | null, b: string | null): string {
  const lo = a ?? "";
  const hi = b ?? "";
  let out = "";
  let i = 0;
  for (;;) {
    // Pad `a` with the minimum digit and `b` with one-past-max so nulls fall out naturally.
    const x = i < lo.length ? idx(lo[i]!) : 0;
    const y = i < hi.length ? idx(hi[i]!) : BASE;
    if (x === y) {
      out += DIGITS[x];
      i++;
      continue;
    }
    const mid = Math.floor((x + y) / 2);
    if (mid === x) {
      // Digits are adjacent — copy this one and go deeper (the boundary tightens).
      out += DIGITS[x];
      i++;
      continue;
    }
    return out + DIGITS[mid];
  }
}

/** Convenience: the key for a new item appended after `last` (or first if last is null). */
export function keyAfter(last: string | null): string {
  return keyBetween(last, null);
}
