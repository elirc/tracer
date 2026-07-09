/**
 * Cursor pagination (ADR-0004). We encode the sort key of the last row into an opaque cursor
 * the client echoes back. Unlike OFFSET, a cursor is stable under concurrent inserts (no rows
 * skipped or repeated) and stays O(log n) instead of scanning+discarding N rows.
 *
 * These are pure functions so the cursor contract is unit-testable without a database.
 */
export interface Cursor {
  createdAt: string; // ISO
  id: string;
}

export function encodeCursor(c: Cursor): string {
  return Buffer.from(`${c.createdAt}|${c.id}`, "utf8").toString("base64url");
}

export function decodeCursor(raw: string | undefined): Cursor | null {
  if (!raw) return null;
  try {
    const [createdAt, id] = Buffer.from(raw, "base64url").toString("utf8").split("|");
    if (!createdAt || !id) return null;
    return { createdAt, id };
  } catch {
    return null;
  }
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

/** Given `limit + 1` rows, split off the extra and produce the next cursor. */
export function toPage<T extends { id: string; createdAt: Date }>(
  rows: T[],
  limit: number,
): Page<T> {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const last = items[items.length - 1];
  return {
    items,
    nextCursor: hasMore && last ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id }) : null,
  };
}
