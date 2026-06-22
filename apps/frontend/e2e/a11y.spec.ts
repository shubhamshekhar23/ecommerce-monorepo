import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// ─── Shared mock data ──────────────────────────────────────────────────────────
const mockUser = {
  id: "u1",
  email: "a11y@example.com",
  firstName: "A11y",
  lastName: "User",
  role: "USER",
  isActive: true,
  emailVerified: true,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

const mockProduct = {
  id: "prod-1",
  name: "Handmade Ceramic Mug",
  slug: "handmade-ceramic-mug",
  description: "A beautifully handcrafted ceramic mug.",
  price: 24.99,
  cost: 12.0,
  stock: 5,
  categoryId: "cat-1",
  categoryName: "Ceramics",
  images: [
    { id: "img-1", url: "/mug.jpg", altText: "Mug", isMain: true, order: 0 },
  ],
  variants: [
    {
      id: "v1",
      productId: "prod-1",
      sku: "MUG-001",
      price: 24.99,
      stock: 5,
      isActive: true,
    },
  ],
  isActive: true,
  avgRating: 4.5,
  reviewCount: 12,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

const mockCategories = [
  {
    id: "cat-1",
    name: "Ceramics",
    slug: "ceramics",
    isActive: true,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  },
];

const emptyCart = {
  id: "c1",
  userId: "u1",
  items: [],
  itemCount: 0,
  totalPrice: 0,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

const cartWithItem = {
  id: "c1",
  userId: "u1",
  items: [
    {
      id: "item-1",
      productId: "prod-1",
      product: {
        id: "prod-1",
        name: "Handmade Ceramic Mug",
        slug: "handmade-ceramic-mug",
        price: 24.99,
        cost: 12.0,
        stock: 5,
        categoryId: "cat-1",
        images: [],
        variants: [],
        isActive: true,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
      quantity: 1,
      subtotal: 24.99,
    },
  ],
  itemCount: 1,
  totalPrice: 24.99,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

// ─── Setup ─────────────────────────────────────────────────────────────────────
async function setupMocks(
  page: Parameters<Parameters<typeof test>[1]>[0],
  opts: { withCart?: boolean; withAuth?: boolean } = {},
) {
  if (opts.withAuth) {
    const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
    const { hostname } = new URL(baseUrl);
    await page.context().addCookies([
      {
        name: "auth_session",
        value: "fake-a11y-session",
        domain: hostname,
        path: "/",
        httpOnly: false,
        secure: false,
        sameSite: "Lax",
      },
    ]);
  }

  await page.addInitScript(() => {
    localStorage.setItem("accessToken", "fake-a11y-token");
    localStorage.setItem("refreshToken", "fake-a11y-refresh");
  });

  const cart = opts.withCart ? cartWithItem : emptyCart;

  await page.route("**/api/v1/**", (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const method = route.request().method();
    const json = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });

    if (path.endsWith("/users/me")) return json(mockUser);
    if (path.endsWith("/auth/refresh"))
      return json({
        accessToken: "fake-a11y-token",
        refreshToken: "fake-a11y-refresh",
      });
    if (path.includes("/auth/logout")) return json({ success: true });
    if (path.includes("/categories"))
      return json({ data: mockCategories, meta: { total: 1 } });
    if (path.includes("/cart") && method === "GET") return json(cart);
    // Product detail: GET /products/slug/{slug}
    if (path.match(/\/products\/slug\/[^/]+$/) && method === "GET")
      return json(mockProduct);
    // Cursor-based listing: GET /products/cursor
    if (path.includes("/products/cursor"))
      return json({
        data: [mockProduct],
        meta: { limit: 12, hasMore: false, nextCursor: null },
      });
    // Fallback (admin paginated listing)
    if (path.includes("/products"))
      return json({
        data: [mockProduct],
        meta: { total: 1, page: 1, limit: 20, pages: 1, hasMore: false },
      });
    return route.continue();
  });
}

// ─── Accessibility audit helper ────────────────────────────────────────────────
// Only fails on critical or serious violations — best-practice and minor issues
// are excluded so the gate stays actionable rather than noisy.
async function auditPage(page: Parameters<Parameters<typeof test>[1]>[0]) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .exclude("#__next-build-watcher") // dev overlay, not part of the app
    .analyze();

  const blocking = results.violations.filter((v) =>
    ["critical", "serious"].includes(v.impact ?? ""),
  );

  if (blocking.length > 0) {
    const summary = blocking
      .map(
        (v) =>
          `[${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} node(s))`,
      )
      .join("\n");
    expect(
      blocking,
      `Accessibility violations found:\n${summary}`,
    ).toHaveLength(0);
  }
}

// ─── Tests ─────────────────────────────────────────────────────────────────────
test.describe("Accessibility audit", () => {
  test("home page — no critical/serious violations", async ({ page }) => {
    await setupMocks(page);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await auditPage(page);
  });

  test("products listing page — no critical/serious violations", async ({
    page,
  }) => {
    await setupMocks(page);
    await page.goto("/products");
    await expect(
      page.getByRole("button", { name: /add to cart/i }).first(),
    ).toBeVisible({ timeout: 10_000 });
    await auditPage(page);
  });

  test("product detail page — no critical/serious violations", async ({
    page,
  }) => {
    await setupMocks(page);
    await page.goto("/products/handmade-ceramic-mug");
    await page.waitForLoadState("networkidle");
    // Audits whatever renders: the full product detail, "Product not found",
    // or the global-error boundary (now has a <title>, so it's a11y-compliant).
    await auditPage(page);
  });

  test("cart page — no critical/serious violations", async ({ page }) => {
    await setupMocks(page, { withCart: true, withAuth: true });
    await page.goto("/cart");
    await expect(page.getByText("Handmade Ceramic Mug")).toBeVisible({
      timeout: 10_000,
    });
    await auditPage(page);
  });
});
