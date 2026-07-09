// Performance instrumentation for the latency budget (docs/latency-budget.md). We measure now so
// Sprint 12 can enforce budgets in CI with before/after evidence — you can't optimize what you
// never measured.

/** Time a synchronous interaction; warn (in dev) when it blows the per-frame budget. */
export function measureSync(name: string, budgetMs: number, fn: () => void): void {
  const start = performance.now();
  fn();
  const ms = performance.now() - start;
  if (import.meta.env.DEV && ms > budgetMs) {
    console.warn(`[perf] ${name} took ${ms.toFixed(1)}ms (budget ${budgetMs}ms)`);
  }
}

/** Start a span; call the returned fn when the interaction completes. */
export function startMark(name: string): () => void {
  const start = performance.now();
  return () => {
    if (import.meta.env.DEV) {
      console.debug(`[perf] ${name}: ${(performance.now() - start).toFixed(1)}ms`);
    }
  };
}
