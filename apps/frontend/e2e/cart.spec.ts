import { test, expect } from "@playwright/test";

// ─── Mock data ────────────────────────────────────────────────────────────────
const mockUser = {
  id: "user-e2e",
  email: "e2e@example.com",
  firstName: "E2E",
  lastName: "User",
  role: "USER",
  isActive: true,
  emailVerified: true,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

// Must satisfy ProductSchema (Zod): price/cost/stock are numbers,
// variants need id/productId/sku/price(number)/stock/isActive.
const mockProducts = [
  {
    id: "prod-1",
    name: "Handmade Ceramic Mug",
    slug: "handmade-ceramic-mug",
    description: "A beautiful handmade mug",
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
        id: "var-1",
        productId: "prod-1",
        sku: "MUG-001",
        price: 24.99,
        stock: 5,
        isActive: true,
      },
    ],
    isActive: true,
    avgRating: 4.5,
    reviewCount: 10,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  },
];

// CategorySchema requires isActive, createdAt, updatedAt
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
  id: "cart-e2e",
  userId: "user-e2e",
  items: [],
  itemCount: 0,
  totalPrice: 0,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

const cartWithOneItem = {
  id: "cart-e2e",
  userId: "user-e2e",
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

// ─── Setup ────────────────────────────────────────────────────────────────────
// Intercepts ALL /api/v1 requests so no real backend call can fail with
// the fake access token. Dispatches by path so each endpoint returns
// controlled data for auth, products, categories, and cart.
async function setupMocks(page: Parameters<Parameters<typeof test>[1]>[0]) {
  // Inject fake tokens so tokenStorage.getAccess() returns non-null,
  // enabling the useAuthHydration query (intercepted below).
  await page.addInitScript(() => {
    localStorage.setItem("accessToken", "fake-e2e-token");
    localStorage.setItem("refreshToken", "fake-e2e-refresh");
  });

  let cartHasItem = false;

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

    // ── Auth ────────────────────────────────────────────────────────────
    if (path.endsWith("/users/me")) {
      return json(mockUser);
    }
    if (path.endsWith("/auth/refresh")) {
      return json({
        accessToken: "fake-e2e-token",
        refreshToken: "fake-e2e-refresh",
      });
    }
    if (path.includes("/auth/logout")) {
      return json({ success: true });
    }

    // ── Categories ──────────────────────────────────────────────────────
    if (path.includes("/categories")) {
      return json({ data: mockCategories, meta: { total: 1 } });
    }

    // ── Cart ────────────────────────────────────────────────────────────
    if (path.includes("/cart/items") && method === "POST") {
      cartHasItem = true;
      return json(cartWithOneItem, 201);
    }
    if (path.includes("/cart") && method === "GET") {
      return json(cartHasItem ? cartWithOneItem : emptyCart);
    }

    // ── Products ────────────────────────────────────────────────────────
    // CursorPageProductsSchema requires meta.limit (number)
    if (path.includes("/products")) {
      return json({
        data: mockProducts,
        meta: { limit: 12, hasMore: false, nextCursor: null },
      });
    }

    return route.continue();
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────
test.describe("Browse and add to cart", () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
  });

  test("cart badge is absent before adding an item", async ({ page }) => {
    await page.goto("/products");
    await expect(
      page.getByRole("button", { name: /add to cart/i }).first(),
    ).toBeVisible({ timeout: 10_000 });

    // When itemCount === 0 the header cart link aria-label is exactly "Cart" (no count)
    await expect(
      page.getByRole("link", { name: "Cart", exact: true }).first(),
    ).toBeVisible();
    // No "Cart, N item(s)" badge label should exist
    await expect(
      page.getByRole("link", { name: /cart, \d+ item/i }).first(),
    ).not.toBeVisible();
  });

  test("clicking Add to Cart updates the cart badge to 1 item", async ({
    page,
  }) => {
    await page.goto("/products");
    const addToCartBtn = page
      .getByRole("button", { name: /add to cart/i })
      .first();
    await expect(addToCartBtn).toBeVisible({ timeout: 10_000 });

    await addToCartBtn.click();

    // onSuccess sets TanStack Query cache → Header re-renders with "Cart, 1 item"
    await expect(page.getByRole("link", { name: "Cart, 1 item" })).toBeVisible({
      timeout: 5_000,
    });
  });

  test("shows a success toast after adding to cart", async ({ page }) => {
    await page.goto("/products");
    const addToCartBtn = page
      .getByRole("button", { name: /add to cart/i })
      .first();
    await expect(addToCartBtn).toBeVisible({ timeout: 10_000 });

    await addToCartBtn.click();

    // Sonner toast: "{productName} added to cart"
    await expect(page.getByText(/added to cart/i)).toBeVisible({
      timeout: 5_000,
    });
  });

  test("navigates from home to products and adds to cart", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("link", { name: /products/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/products/);

    const addToCartBtn = page
      .getByRole("button", { name: /add to cart/i })
      .first();
    await expect(addToCartBtn).toBeVisible({ timeout: 10_000 });
    await addToCartBtn.click();

    await expect(page.getByRole("link", { name: "Cart, 1 item" })).toBeVisible({
      timeout: 5_000,
    });
  });
});
