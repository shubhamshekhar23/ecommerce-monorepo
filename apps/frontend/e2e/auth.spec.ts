import { test, expect } from "@playwright/test";

test.describe("Auth flow", () => {
  test("redirects unauthenticated user from /orders to /login", async ({
    page,
  }) => {
    await page.goto("/orders");
    await expect(page).toHaveURL(/\/login/);
  });

  test("login page shows email and password fields", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel(/email address/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("shows session expired banner via query param", async ({ page }) => {
    await page.goto("/login?session_expired=1");
    await expect(page.getByRole("alert")).toContainText(/session expired/i);
  });

  test("shows validation error on empty submit", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByText(/invalid email/i)).toBeVisible();
  });
});
