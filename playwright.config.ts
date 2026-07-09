import { defineConfig } from "@playwright/test";

// Scaffold (Sprint 05). Run locally with: pnpm dlx playwright test
// The suite consolidates and joins CI (with a Postgres service) as the app stabilizes.
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  use: {
    baseURL: process.env.WEB_URL ?? "http://localhost:5173",
    trace: "on-first-retry",
  },
});
