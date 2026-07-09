import { describe, it, expect } from "vitest";
import { redact, buildErrorReport, type Breadcrumb, type SyncContext } from "./redact";

const sync: SyncContext = { connectionState: "reconnecting", pendingCount: 3, lastSeq: 4210 };

describe("redact", () => {
  it("strips user-content values but keeps keys and non-PII fields", () => {
    const out = redact({ title: "Fix the login bug", issueId: "iss_1", teamId: "team_eng" });
    expect(out).toEqual({ title: "[redacted]", issueId: "iss_1", teamId: "team_eng" });
  });

  it("is case-insensitive on field names", () => {
    expect(redact({ Title: "secret", BODY: "secret" })).toEqual({ Title: "[redacted]", BODY: "[redacted]" });
  });
});

describe("buildErrorReport", () => {
  it("attaches sync context and scrubs every breadcrumb", () => {
    const crumbs: Breadcrumb[] = [
      { category: "mutation", message: "issue.update", data: { entityId: "iss_9", title: "Ship v1" } },
      { category: "ws", message: "reconnect", data: { attempt: 2 } },
    ];
    const report = buildErrorReport(sync, crumbs);
    expect(report.sync).toEqual(sync);
    expect(report.breadcrumbs[0]?.data).toEqual({ entityId: "iss_9", title: "[redacted]" });
    expect(report.breadcrumbs[1]?.data).toEqual({ attempt: 2 }); // nothing to redact
  });

  it("leaves breadcrumbs without data untouched", () => {
    const report = buildErrorReport(sync, [{ category: "nav", message: "open board" }]);
    expect(report.breadcrumbs[0]).toEqual({ category: "nav", message: "open board" });
  });
});
