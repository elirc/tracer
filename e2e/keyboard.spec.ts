import { test, expect } from "@playwright/test";

// Tracer's signature test: the primary flow completed with the KEYBOARD ONLY. If this breaks,
// Tracer stopped being Tracer. Scaffold — expand as the flows stabilize (Sprint 14 hardens the
// accessible keyboard path; this file is where that guarantee lives).
test("sign in (dev) and open the command palette with the keyboard", async ({ page }) => {
  await page.goto("/");
  // Sign in via the dev provider (the fake IdP round-trips back to the app).
  await page.getByRole("link", { name: /sign in/i }).click();
  await expect(page.getByText(/signed in as/i)).toBeVisible();

  // Cmd/Ctrl+K opens the palette even while nothing is focused.
  await page.keyboard.press("Control+k");
  await expect(page.getByPlaceholder(/type a command/i)).toBeVisible();

  // Escape closes it.
  await page.keyboard.press("Escape");
  await expect(page.getByPlaceholder(/type a command/i)).toBeHidden();
});
