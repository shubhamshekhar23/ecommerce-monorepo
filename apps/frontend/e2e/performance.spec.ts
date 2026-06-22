import { test, expect } from "@playwright/test";

// page.metrics() uses the Chrome DevTools Protocol — only available on Chromium.
// Soft assertions (expect.soft) warn without failing the test run, matching the
// spec requirement: "warn, not fail, if a navigation exceeds the threshold."
const SCRIPT_DURATION_THRESHOLD_S = 2.0;

test.describe("Navigation performance metrics", () => {
  test.skip(
    ({ browserName }) => browserName !== "chromium",
    "page.metrics() requires Chromium (Chrome DevTools Protocol)",
  );

  test("product listing → product detail scripting time stays under threshold", async ({
    page,
  }) => {
    // ── products listing ────────────────────────────────────────────────────
    await page.goto("/products");
    await expect(page.getByRole("heading", { name: "Products" })).toBeVisible({
      timeout: 15_000,
    });

    const metricsBeforeNav = await page.metrics();

    // ── navigate to the first product detail ────────────────────────────────
    const firstCard = page.locator('a[href^="/products/"]').first();
    await expect(firstCard).toBeVisible({ timeout: 10_000 });
    const detailHref = await firstCard.getAttribute("href");
    await firstCard.click();
    await expect(page).toHaveURL(detailHref!);

    // Wait for the product detail heading to confirm the page has rendered.
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
      timeout: 10_000,
    });

    const metricsAfterNav = await page.metrics();

    // ── delta ScriptDuration for the navigation step ─────────────────────────
    const deltaScript =
      (metricsAfterNav["ScriptDuration"] ?? 0) -
      (metricsBeforeNav["ScriptDuration"] ?? 0);

    // Soft assertion: test still passes if over threshold but the report shows a warning.
    expect
      .soft(deltaScript, `ScriptDuration delta ${deltaScript.toFixed(3)}s`)
      .toBeLessThan(SCRIPT_DURATION_THRESHOLD_S);

    // ── TaskDuration: total main-thread time for the navigation ──────────────
    const deltaTask =
      (metricsAfterNav["TaskDuration"] ?? 0) -
      (metricsBeforeNav["TaskDuration"] ?? 0);

    expect
      .soft(deltaTask, `TaskDuration delta ${deltaTask.toFixed(3)}s`)
      .toBeLessThan(SCRIPT_DURATION_THRESHOLD_S * 2);
  });

  test("products listing initial load scripting time stays under threshold", async ({
    page,
  }) => {
    await page.goto("/products");

    // Wait for the first product card to confirm hydration completed.
    await expect(page.locator('a[href^="/products/"]').first()).toBeVisible({
      timeout: 15_000,
    });

    const metrics = await page.metrics();
    const scriptDuration = metrics["ScriptDuration"] ?? 0;

    expect
      .soft(
        scriptDuration,
        `Initial load ScriptDuration ${scriptDuration.toFixed(3)}s`,
      )
      .toBeLessThan(SCRIPT_DURATION_THRESHOLD_S);
  });
});
