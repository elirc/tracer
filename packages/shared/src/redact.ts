/**
 * Error-report context for an offline-first client (S15). Two hard-won lessons live here:
 *
 * 1. An offline-first bug is UNDEBUGGABLE without the sync state at the moment it happened. "It didn't
 *    save" means one thing with an empty pending queue and a live connection, and something completely
 *    different with 12 pending mutations while reconnecting. So every error report carries the three
 *    fields that turn a mystery into a diagnosis: connection state, pending-queue length, lastSeq.
 *
 * 2. Those reports go to a THIRD-PARTY processor (Sentry). User content — issue titles, comment bodies
 *    — must never ride along. Data leaving your trust boundary is the moment to scrub PII, not later.
 */

export type ConnectionState = "connecting" | "live" | "reconnecting" | "offline";

export interface SyncContext {
  connectionState: ConnectionState;
  /** how many optimistic mutations are unacknowledged */
  pendingCount: number;
  /** the highest seq this client has applied */
  lastSeq: number;
}

export interface Breadcrumb {
  category: string;
  message: string;
  data?: Record<string, unknown>;
}

/** Field names whose VALUES are user content and must be stripped before leaving our system. */
const PII_KEYS = new Set(["title", "description", "name", "email", "body", "content", "text"]);

/** Replace user-content field values with a placeholder; keep the keys so structure stays debuggable. */
export function redact(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    out[k] = PII_KEYS.has(k.toLowerCase()) ? "[redacted]" : v;
  }
  return out;
}

export interface ErrorReport {
  sync: SyncContext;
  breadcrumbs: Breadcrumb[];
}

/** Assemble the report Sentry will receive: sync context attached, every breadcrumb scrubbed. */
export function buildErrorReport(sync: SyncContext, breadcrumbs: Breadcrumb[]): ErrorReport {
  return {
    sync,
    breadcrumbs: breadcrumbs.map((b) => (b.data ? { ...b, data: redact(b.data) } : b)),
  };
}
