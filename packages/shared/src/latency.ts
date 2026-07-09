/**
 * Latency as users feel it (S15). The metric that matters for a real-time app is not "server latency"
 * — it's "how long until my edit shows up on your screen", and its shape is a distribution with a
 * long tail. An *average* hides the tail: 95 fast requests bury 5 users watching a spinner. So we
 * summarize with percentiles and phrase SLOs against them ("p95 < 500ms"), never against the mean.
 */

export interface LatencySummary {
  count: number;
  /** median */
  p50: number;
  /** the SLO percentile — the slow experience a few users actually get */
  p95: number;
  /** the "worst realistic" — one bad GC or reconnect */
  p99: number;
  max: number;
}

/**
 * Nearest-rank percentile over an UNSORTED sample. `q` in [0,1]. Empty sample → 0 (nothing measured
 * can't be slow). We copy-then-sort so the caller's buffer is never mutated — a metrics reader must
 * be side-effect-free, or two dashboards reading at once corrupt each other.
 */
export function percentile(samples: readonly number[], q: number): number {
  if (samples.length === 0) return 0;
  const sorted = [...samples].sort((a, b) => a - b);
  const rank = Math.min(sorted.length, Math.max(1, Math.ceil(q * sorted.length)));
  return sorted[rank - 1] as number;
}

export function summarize(samples: readonly number[]): LatencySummary {
  return {
    count: samples.length,
    p50: percentile(samples, 0.5),
    p95: percentile(samples, 0.95),
    p99: percentile(samples, 0.99),
    max: samples.length ? Math.max(...samples) : 0,
  };
}

/**
 * SLO check: does the tail stay under budget? An empty sample is *healthy* — you can't have burned an
 * error budget you never spent. (This choice matters: the alternative, treating "no data" as a
 * violation, pages you every deploy when metrics reset.)
 */
export function withinSlo(samples: readonly number[], budgetMs: number, q = 0.95): boolean {
  return percentile(samples, q) <= budgetMs;
}
