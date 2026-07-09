import { describe, it, expect, afterAll } from "vitest";
import { buildServer } from "./server";

const app = buildServer();
afterAll(async () => {
  await app.close();
});

describe("health routes", () => {
  it("GET /health returns ok", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });
  });

  it("GET /ready returns ready", async () => {
    const res = await app.inject({ method: "GET", url: "/ready" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ready" });
  });
});

describe("observability (S15)", () => {
  it("GET /metrics returns counters, gauges, and an SLO verdict", async () => {
    const res = await app.inject({ method: "GET", url: "/metrics" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty("counters");
    expect(body).toHaveProperty("gauges");
    expect(body.slo).toEqual({ budgetMs: 500, p95WithinBudget: true }); // empty sample = healthy
  });

  it("echoes an inbound x-request-id so a trace spans the LB and the API", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/health",
      headers: { "x-request-id": "req_abc123" },
    });
    expect(res.headers["x-request-id"]).toBe("req_abc123");
  });

  it("mints a request id when none is supplied", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(typeof res.headers["x-request-id"]).toBe("string");
    expect((res.headers["x-request-id"] as string).length).toBeGreaterThan(0);
  });
});
