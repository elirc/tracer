import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { estimateOffsetMs, toServerTime, lifecycle } from "./trace";

describe("clock offset estimation", () => {
  it("recovers a known offset under symmetric transit", () => {
    // Server runs 1000ms AHEAD of the client; one-way transit 50ms.
    // client sends at client-time 0 -> arrives at server-time 1050
    // server replies at server-time 1050 -> arrives at client-time 100
    const offset = estimateOffsetMs({ sentAt: 0, serverAt: 1050, recvAt: 100 });
    // offset is (remote - server) = client - server = -1000
    expect(offset).toBeCloseTo(-1000, 6);
  });

  it("toServerTime inverts the offset", () => {
    const offset = -1000; // client is 1000ms behind server
    // a client-clock timestamp of 100 is really server-time 1100
    expect(toServerTime(100, offset)).toBe(1100);
  });

  it("property: estimate then correct recovers server time for any offset/transit", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -100_000, max: 100_000 }), // true offset (client - server)
        fc.integer({ min: 1, max: 5_000 }), // one-way transit
        fc.integer({ min: 0, max: 1_000_000 }), // server time of some event
        (trueOffset, transit, serverEventTime) => {
          const sentAt = 0;
          const serverAt = sentAt - trueOffset + transit; // convert client->server + transit
          const recvAt = serverAt + trueOffset + transit; // back to client clock
          const est = estimateOffsetMs({ sentAt, serverAt, recvAt });
          // A client timestamp for the event is serverEventTime in client clock:
          const clientEventTs = serverEventTime + trueOffset;
          return Math.abs(toServerTime(clientEventTs, est) - serverEventTime) < 1e-6;
        },
      ),
    );
  });
});

describe("mutation lifecycle", () => {
  it("skew correction turns a nonsense negative latency into the true one", () => {
    // Foreign client's clock is 5000ms BEHIND the server (offset = client - server = -5000).
    // Real timeline (server clock): commit@1000, fanout@1005, applied@1200 -> end-to-end 200ms.
    // The foreign client STAMPS the apply in ITS clock: 1200 + (-5000) = -3800.
    const marks = {
      serverCommit: 1000,
      fanoutEmit: 1005,
      foreignApply: -3800, // raw foreign-clock timestamp
      foreignOffsetMs: -5000,
    };
    const naive = marks.foreignApply - marks.serverCommit; // what you'd get without correction
    expect(naive).toBeLessThan(0); // -4800ms: obviously garbage

    const l = lifecycle(marks);
    expect(l.commitToFanoutMs).toBe(5);
    expect(l.fanoutToApplyMs).toBe(195);
    expect(l.endToEndMs).toBe(200); // the number users feel, now correct
  });
});
