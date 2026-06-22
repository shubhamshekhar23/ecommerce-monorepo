import { test, expect } from "@playwright/test";

// ─── Stripe mock ───────────────────────────────────────────────────────────────
// @stripe/react-stripe-js validates the stripe instance with isStripe():
// requires elements, createToken, createPaymentMethod, confirmCardPayment.
const STRIPE_MOCK_SCRIPT = `
(function () {
  const makeElement = () => ({
    mount: function() {}, unmount: function() {}, destroy: function() {},
    update: function() {}, on: function() {}, off: function() {},
  });
  const elementsInstance = (function () {
    const store = {};
    return {
      create: function (type) { store[type] = makeElement(); return store[type]; },
      getElement: function (t) { const k = typeof t === 'string' ? t : 'card'; return store[k] || makeElement(); },
      submit: function () { return Promise.resolve({ error: null }); },
      fetchUpdates: function () { return Promise.resolve({}); },
    };
  }());
  window.Stripe = function MockStripe() {
    return {
      elements: function () { return elementsInstance; },
      createToken: function () { return Promise.resolve({ token: { id: 'tok_mock' } }); },
      createPaymentMethod: function () { return Promise.resolve({ paymentMethod: { id: 'pm_mock' } }); },
      confirmCardPayment: function () { return Promise.resolve({ paymentIntent: { id: 'pi_mock', status: 'succeeded' } }); },
      retrievePaymentIntent: function () { return Promise.resolve({ paymentIntent: { id: 'pi_mock', status: 'succeeded' } }); },
    };
  };
  window.Stripe.version = '3';
}());
`;

// ─── Shared mock data ──────────────────────────────────────────────────────────
const mockUser = {
  id: "u1",
  email: "e2e@example.com",
  firstName: "E2E",
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

// ─── Setup helpers ─────────────────────────────────────────────────────────────
async function setupPublicMocks(
  page: Parameters<Parameters<typeof test>[1]>[0],
) {
  await page.addInitScript(() => {
    localStorage.setItem("accessToken", "fake-e2e-token");
    localStorage.setItem("refreshToken", "fake-e2e-refresh");
  });
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
        accessToken: "fake-e2e-token",
        refreshToken: "fake-e2e-refresh",
      });
    if (path.includes("/auth/logout")) return json({ success: true });
    if (path.includes("/categories"))
      return json({ data: mockCategories, meta: { total: 1 } });
    if (path.includes("/cart") && method === "GET") return json(emptyCart);
    if (path.includes("/products"))
      return json({
        data: [mockProduct],
        meta: { limit: 12, hasMore: false, nextCursor: null },
      });
    return route.continue();
  });
}

async function setupProtectedMocks(
  page: Parameters<Parameters<typeof test>[1]>[0],
  opts: { withCart?: boolean } = {},
) {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
  const { hostname } = new URL(baseUrl);
  await page
    .context()
    .addCookies([
      {
        name: "auth_session",
        value: "fake-e2e-session",
        domain: hostname,
        path: "/",
        httpOnly: false,
        secure: false,
        sameSite: "Lax",
      },
    ]);

  await page.addInitScript(() => {
    localStorage.setItem("accessToken", "fake-e2e-token");
    localStorage.setItem("refreshToken", "fake-e2e-refresh");
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
        accessToken: "fake-e2e-token",
        refreshToken: "fake-e2e-refresh",
      });
    if (path.includes("/auth/logout")) return json({ success: true });
    if (path.includes("/categories"))
      return json({ data: mockCategories, meta: { total: 1 } });
    if (path.includes("/cart") && method === "GET") return json(cart);
    if (path.includes("/products"))
      return json({
        data: [mockProduct],
        meta: { limit: 12, hasMore: false, nextCursor: null },
      });
    return route.continue();
  });
}

// ─── Screenshot tests ──────────────────────────────────────────────────────────
// Baselines are captured on the first run and stored in e2e/visual.spec.ts-snapshots/.
// Subsequent runs compare against those baselines; changes fail CI.
// maxDiffPixels allows for minor sub-pixel rendering variance across runs.

test.describe("Visual regression", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("Navbar — authenticated, no cart items", async ({ page }) => {
    await setupPublicMocks(page);
    await page.goto("/products");

    // Wait for auth hydration and cart badge to settle
    await expect(
      page.getByRole("button", { name: /add to cart/i }).first(),
    ).toBeVisible({ timeout: 10_000 });

    const navbar = page.locator("header").first();
    await expect(navbar).toHaveScreenshot("navbar-authenticated.png", {
      maxDiffPixels: 50,
    });
  });

  test("ProductCard — in-stock item", async ({ page }) => {
    await setupPublicMocks(page);
    await page.goto("/products");

    await expect(
      page.getByRole("button", { name: /add to cart/i }).first(),
    ).toBeVisible({ timeout: 10_000 });

    // Screenshot the first product card
    const card = page
      .locator("article, [class*='card'], [class*='Card']")
      .first();
    await expect(card).toHaveScreenshot("product-card.png", {
      maxDiffPixels: 50,
    });
  });

  test("checkout form — payment details stage", async ({ page }) => {
    await setupProtectedMocks(page, { withCart: true });

    // Stripe.js must be intercepted before goto — it loads at page init
    await page.route("https://js.stripe.com/**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/javascript",
        body: STRIPE_MOCK_SCRIPT,
      }),
    );

    // Seed sessionStorage so CheckoutView skips review and jumps to payment form
    await page.addInitScript(() => {
      sessionStorage.setItem("checkout-order-id", "order-visual");
      sessionStorage.setItem("checkout-client-secret", "pi_visual_secret_mock");
    });

    await page.goto("/checkout");
    // Wait for the Pay button (proxy for the payment form being fully rendered)
    await expect(page.getByRole("button", { name: /pay \$/i })).toBeVisible({
      timeout: 10_000,
    });

    const form = page.locator("form").first();
    await expect(form).toHaveScreenshot("checkout-payment-form.png", {
      maxDiffPixels: 50,
    });
  });

  test("products page — full page layout", async ({ page }) => {
    await setupPublicMocks(page);
    await page.goto("/products");
    await expect(
      page.getByRole("button", { name: /add to cart/i }).first(),
    ).toBeVisible({ timeout: 10_000 });

    await expect(page).toHaveScreenshot("products-page.png", {
      fullPage: true,
      maxDiffPixels: 100,
      // Mask elements that change between runs (dev toolbars, timestamps)
      mask: [
        page.locator("[data-nextjs-dialog]"),
        page.locator(".__next-build-watcher"),
        page.locator("[class*='devtools'], [class*='DevTools']"),
      ],
    });
  });
});
