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

function toBaseN(value: number, digits: number): string {
  let out = "";
  for (let i = 0; i < digits; i++) {
    out = DIGITS[value % BASE] + out;
    value = Math.floor(value / BASE);
  }
  return out;
}

/**
 * Rebalancing (S12, harvest of flaw #2). When repeated same-slot inserts have grown the keys long,
 * we reassign the whole column to `n` evenly-spaced, SHORT keys. The new keys are uniform length,
 * so future inserts between them start short again. A rebalance emits ordinary mutations (each issue
 * gets a new sortOrder), so it flows through the sync engine like any other change.
 */
export function evenKeys(n: number): string[] {
  if (n <= 0) return [];
  let digits = 1;
  while (Math.pow(BASE, digits) < n + 2) digits++;
  const span = Math.pow(BASE, digits);
  const keys: string[] = [];
  for (let i = 1; i <= n; i++) {
    let pos = Math.round((i * span) / (n + 1));
    if (pos < 1) pos = 1;
    if (pos > span - 1) pos = span - 1;
    keys.push(toBaseN(pos, digits));
  }
  return keys;
}

/** The metric that tells you when to rebalance (Sprint 12 alerts on its p95). */
export function maxKeyLength(keys: string[]): number {
  return keys.reduce((m, k) => Math.max(m, k.length), 0);
}
