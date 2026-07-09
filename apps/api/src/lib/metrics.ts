import { summarize, withinSlo, type LatencySummary } from "@tracer/shared";

/**
 * A tiny in-process metrics registry (S15). Real deployments scrape a proper backend (Prometheus,
 * OTel); at this scale a hand-rolled registry teaches the shape without the ops weight. Two rules it
 * embodies:
 *
 *  - **A metric must never leak memory.** The latency sample is a BOUNDED ring — an unbounded array of
 *    every observation ever is itself an outage waiting to happen. Observability must be cheaper than
 *    the thing it observes.
 *  - **SLOs are phrased on percentiles**, computed from @tracer/shared so client and server agree on
 *    what "p95" means.
 */

/** SLO: p95 of mutation-commit → foreign-client-apply. Baseline from the S13 chaos run. */
const SLO_BUDGET_MS = 500;
const LAG_SAMPLE_CAP = 1024;

const counters = new Map<string, number>();
const gauges = new Map<string, number>();
const lagSamples: number[] = [];

export function incr(name: string, by = 1): void {
  counters.set(name, (counters.get(name) ?? 0) + by);
}

export function setGauge(name: string, value: number): void {
  gauges.set(name, value);
}

/**
 * Record one end-to-end fanout latency (ms). Fed by the client beacon that timestamps foreign-apply
 * and reports it back (see docs/curriculum/sprint-15.md); server-only timing can't see the last hop.
 */
export function observeFanoutLagMs(ms: number): void {
  lagSamples.push(ms);
  if (lagSamples.length > LAG_SAMPLE_CAP) lagSamples.shift();
}

export interface MetricsSnapshot {
  counters: Record<string, number>;
  gauges: Record<string, number>;
  fanoutLag: LatencySummary;
  slo: { budgetMs: number; p95WithinBudget: boolean };
}

/** A pure read of current state — safe to call from a route handler under concurrent scrapes. */
export function snapshot(): MetricsSnapshot {
  return {
    counters: Object.fromEntries(counters),
    gauges: Object.fromEntries(gauges),
    fanoutLag: summarize(lagSamples),
    slo: { budgetMs: SLO_BUDGET_MS, p95WithinBudget: withinSlo(lagSamples, SLO_BUDGET_MS) },
  };
}

/** Test/hygiene helper — reset all series. */
export function resetMetrics(): void {
  counters.clear();
  gauges.clear();
  lagSamples.length = 0;
}
