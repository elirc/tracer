/**
 * Distributed tracing for a CLIENT-INCLUSIVE system (S15). In Tracer the browser is a first-class
 * service in the trace: a mutation's life is
 *
 *     client-send  ─▶  server-commit  ─▶  fanout-emit  ─▶  foreign-client-apply
 *
 * One trace answers "why was my edit slow to reach my teammate?". The catch a pure-server trace never
 * meets: the client marks come from clocks WE DON'T CONTROL, and browser wall-clocks drift by seconds.
 * Subtracting two timestamps from different clocks is how you get a "-300ms" latency in a dashboard.
 * So we never cross clocks without a skew estimate first.
 */

/** A round-trip probe used to estimate one client's clock offset (NTP-style, three timestamps). */
export interface ClockSync {
  /** client wall-clock when it sent the probe */
  sentAt: number;
  /** server wall-clock when it handled the probe (reply assumed sent at the same instant) */
  serverAt: number;
  /** client wall-clock when it received the reply */
  recvAt: number;
}

/**
 * Offset of the REMOTE (client) clock relative to the SERVER clock, i.e. `remote - server`, assuming a
 * roughly symmetric round trip. Positive means the client's clock runs ahead of the server's.
 *
 *   offset = (sentAt + recvAt) / 2  −  serverAt
 *
 * Derivation: forward delay `serverAt − sentAt = d/2 − offset`; return delay
 * `recvAt − serverAt = d/2 + offset`. Subtract to cancel the unknown transit `d` and solve for offset.
 */
export function estimateOffsetMs(s: ClockSync): number {
  return (s.sentAt + s.recvAt) / 2 - s.serverAt;
}

/** Translate a timestamp taken on a remote clock into server time, given that clock's offset. */
export function toServerTime(remoteTs: number, offsetMs: number): number {
  return remoteTs - offsetMs;
}

export interface LifecycleMarks {
  /** server clock: mutation written to the log with its seq */
  serverCommit: number;
  /** server clock: delta handed to fanout */
  fanoutEmit: number;
  /** FOREIGN client clock: the delta applied on another user's screen */
  foreignApply: number;
  /** that foreign client's offset, from estimateOffsetMs */
  foreignOffsetMs: number;
}

export interface Lifecycle {
  /** same-clock subtraction → trustworthy as-is */
  commitToFanoutMs: number;
  /** cross-clock → only meaningful AFTER skew correction */
  fanoutToApplyMs: number;
  /** server-commit → foreign-apply: the number a user actually feels */
  endToEndMs: number;
}

/**
 * Compute the lifecycle spans. The only subtraction that crosses machines (`fanoutEmit` on the server
 * vs `foreignApply` on a client) is corrected via the client's offset first — otherwise a client whose
 * clock is 5s fast would report the edit as arriving *before* it was sent.
 */
export function lifecycle(m: LifecycleMarks): Lifecycle {
  const foreignApplyInServerTime = toServerTime(m.foreignApply, m.foreignOffsetMs);
  return {
    commitToFanoutMs: m.fanoutEmit - m.serverCommit,
    fanoutToApplyMs: foreignApplyInServerTime - m.fanoutEmit,
    endToEndMs: foreignApplyInServerTime - m.serverCommit,
  };
}
