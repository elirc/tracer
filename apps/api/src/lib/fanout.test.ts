import { describe, it, expect } from "vitest";
import { fanout } from "./fanout";
import type { MutationDelta } from "@tracer/shared";

const delta = (seq: number, id: string): MutationDelta => ({
  seq,
  entity: "issue",
  entityId: id,
  op: "create",
  teamId: null,
  mutationId: null,
  data: {},
});

describe("fanout (in-process)", () => {
  it("delivers a delta to subscribers, tagged with its workspace", () => {
    const seen: string[] = [];
    const unsub = fanout.subscribe((wsId) => seen.push(wsId));
    fanout.publish("ws1", delta(1, "i1"));
    fanout.publish("ws2", delta(1, "i2"));
    unsub();
    expect(seen).toEqual(["ws1", "ws2"]);
  });

  it("stops delivering after unsubscribe", () => {
    let count = 0;
    const unsub = fanout.subscribe(() => count++);
    fanout.publish("ws1", delta(1, "i1"));
    unsub();
    fanout.publish("ws1", delta(2, "i1"));
    expect(count).toBe(1);
  });
});
