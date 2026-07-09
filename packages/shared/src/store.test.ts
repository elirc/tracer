import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  emptyStore,
  applyServerDelta,
  reduceDeltas,
  addPending,
  ackMutation,
  materialize,
  type ServerDelta,
} from "./store";

interface Issue {
  id: string;
  title: string;
}

describe("overlay store", () => {
  it("materialize applies the pending overlay on top of committed truth", () => {
    let s = emptyStore<Issue>();
    s = { ...s, committed: { a: { id: "a", title: "server" } } };
    s = addPending(s, { mutationId: "m1", entityId: "a", op: "update", value: { id: "a", title: "mine" } });
    expect(materialize(s)).toEqual([{ id: "a", title: "mine" }]); // optimistic wins in the view
  });

  it("ack drops the pending mutation; committed truth remains", () => {
    let s = emptyStore<Issue>();
    s = addPending(s, { mutationId: "m1", entityId: "a", op: "create", value: { id: "a", title: "new" } });
    // Server confirms with its own value.
    s = { ...s, committed: applyServerDelta(s.committed, { seq: 1, op: "create", entityId: "a", value: { id: "a", title: "new" } }) };
    s = ackMutation(s, "m1");
    expect(s.pending).toHaveLength(0);
    expect(materialize(s)).toEqual([{ id: "a", title: "new" }]); // present exactly once, no duplicate
  });

  it("applyServerDelta is idempotent (safe to replay)", () => {
    const d: ServerDelta<Issue> = { seq: 1, op: "create", entityId: "a", value: { id: "a", title: "x" } };
    const once = applyServerDelta({}, d);
    const twice = applyServerDelta(once, d);
    expect(twice).toEqual(once);
  });

  // Convergence: two clients that receive the SAME deltas in ANY order converge to identical
  // committed state — because we reduce in seq order. This is the whole offline-merge guarantee.
  it("property: delta arrival order does not affect committed state (convergence)", () => {
    const deltaArb = fc.record({
      seq: fc.integer({ min: 1, max: 1000 }),
      op: fc.constantFrom<"create" | "update" | "delete">("create", "update", "delete"),
      entityId: fc.constantFrom("a", "b", "c"),
      value: fc.option(fc.record({ id: fc.constantFrom("a", "b", "c"), title: fc.string() }), { nil: null }),
    });
    fc.assert(
      fc.property(fc.array(deltaArb, { minLength: 1, maxLength: 30 }), (deltas) => {
        // Ensure unique seqs so the "last write per entity" is well-defined.
        const withUniqueSeq: ServerDelta<Issue>[] = deltas.map((d, i) => ({
          ...d,
          seq: i + 1,
          value: d.value ? { id: d.entityId, title: d.value.title } : null,
        }));
        const clientA = reduceDeltas(withUniqueSeq);
        const clientB = reduceDeltas([...withUniqueSeq].reverse());
        const clientC = reduceDeltas(shuffle(withUniqueSeq));
        expect(clientB).toEqual(clientA);
        expect(clientC).toEqual(clientA);
      }),
    );
  });
});

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}
