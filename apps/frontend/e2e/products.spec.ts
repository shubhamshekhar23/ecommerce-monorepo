import { test, expect } from "@playwright/test";

test.describe("Products browse journey", () => {
  test("loads the product listing page", async ({ page }) => {
    await page.goto("/products");
    await expect(page.getByRole("heading", { name: "Products" })).toBeVisible();
    await expect(page).toHaveTitle(/Products.*ShopHub/);
  });

  test("navigates to product detail from card", async ({ page }) => {
    await page.goto("/products");
    // Wait for at least one product card to appear
    const firstCard = page.locator('a[href^="/products/"]').first();
    await expect(firstCard).toBeVisible({ timeout: 10_000 });
    const href = await firstCard.getAttribute("href");
    await firstCard.click();
    await expect(page).toHaveURL(href!);
  });

  test("skip link is the first focusable element and jumps to main content", async ({
    page,
  }) => {
    await page.goto("/products");
    await page.keyboard.press("Tab");
    const focused = page.locator(":focus");
    await expect(focused).toHaveText(/skip to main content/i);
    await page.keyboard.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();
  });
});
