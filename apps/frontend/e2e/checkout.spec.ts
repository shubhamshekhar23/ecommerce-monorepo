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

const cartWithItem = {
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

const mockOrder = {
  id: "order-e2e",
  orderNumber: "ORD-E2E-001",
  userId: "user-e2e",
  status: "PENDING",
  totalPrice: 24.99,
  items: [
    {
      id: "oi-1",
      orderId: "order-e2e",
      productId: "prod-1",
      productName: "Handmade Ceramic Mug",
      quantity: 1,
      price: 24.99,
      subtotal: 24.99,
    },
  ],
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

const mockOrders = {
  data: [mockOrder],
  meta: { total: 1, page: 1, limit: 20, pages: 1, hasMore: false },
};

// Minimal Stripe.js stub returned for all https://js.stripe.com/** requests.
// @stripe/react-stripe-js validates the stripe instance with isStripe():
//   typeof raw.elements === 'function'
//   typeof raw.createToken === 'function'       ← required!
//   typeof raw.createPaymentMethod === 'function'
//   typeof raw.confirmCardPayment === 'function'
// All four must be present or the library keeps stripe === null in context.
const STRIPE_MOCK_SCRIPT = `
(function () {
  const makeElement = () => ({
    mount: function() {},
    unmount: function() {},
    destroy: function() {},
    update: function() {},
    on: function() {},
    off: function() {},
  });

  const elementsInstance = (function () {
    const store = {};
    return {
      create: function (type) {
        store[type] = makeElement();
        return store[type];
      },
      getElement: function (typeOrComponent) {
        const key = typeof typeOrComponent === 'string' ? typeOrComponent : 'card';
        return store[key] || makeElement();
      },
      submit: function () { return Promise.resolve({ error: null }); },
      fetchUpdates: function () { return Promise.resolve({}); },
    };
  }());

  window.Stripe = function MockStripe() {
    return {
      elements: function () { return elementsInstance; },
      // createToken is required by @stripe/react-stripe-js isStripe() validation
      createToken: function () {
        return Promise.resolve({ token: { id: 'tok_mock_e2e' } });
      },
      createPaymentMethod: function () {
        return Promise.resolve({ paymentMethod: { id: 'pm_mock_e2e' } });
      },
      confirmCardPayment: function () {
        return Promise.resolve({
          paymentIntent: { id: 'pi_mock_e2e', status: 'succeeded' },
        });
      },
      retrievePaymentIntent: function () {
        return Promise.resolve({ paymentIntent: { id: 'pi_mock_e2e', status: 'succeeded' } });
      },
    };
  };

  window.Stripe.version = '3';
}());
`;

// ─── Setup ────────────────────────────────────────────────────────────────────
async function setupMocks(
  page: Parameters<Parameters<typeof test>[1]>[0],
  opts: { cartEmpty?: boolean } = {},
) {
  // The Next.js middleware protects /checkout and /orders with an `auth_session`
  // cookie check. Inject it via the browser context so it's sent with the very
  // first server request (addInitScript runs too late — middleware runs before JS).
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
  const { hostname } = new URL(baseUrl);
  await page.context().addCookies([
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

  // Intercept all Stripe.js bundles. @stripe/stripe-js loads from a dynamic
  // path (e.g. /clover/stripe.js) rather than the old /v3/ URL.
  await page.route("https://js.stripe.com/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/javascript",
      body: STRIPE_MOCK_SCRIPT,
    }),
  );

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

    if (path.includes("/cart") && method === "GET")
      return json(
        opts.cartEmpty
          ? {
              id: "c1",
              userId: "u1",
              items: [],
              itemCount: 0,
              totalPrice: 0,
              createdAt: "2024-01-01T00:00:00.000Z",
              updatedAt: "2024-01-01T00:00:00.000Z",
            }
          : cartWithItem,
      );

    // Create order
    if (path.endsWith("/orders") && method === "POST")
      return json(mockOrder, 201);

    // Stripe payment intent
    if (path.includes("/stripe/create-payment-intent") && method === "POST")
      return json({
        paymentIntentId: "pi_mock_e2e",
        clientSecret: "pi_mock_e2e_secret_mock",
        amount: 2499,
        status: "requires_payment_method",
        orderId: "order-e2e",
      });

    // Order detail + list
    if (path.match(/\/orders\/order-e2e$/) && method === "GET")
      return json(mockOrder);
    if (path.includes("/orders/me") && method === "GET")
      return json(mockOrders);

    return route.continue();
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────
test.describe("Full checkout flow", () => {
  test("shows empty-cart message when cart has no items", async ({ page }) => {
    await setupMocks(page, { cartEmpty: true });
    await page.goto("/checkout");
    await expect(page.getByText(/your cart is empty/i)).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      page.getByRole("link", { name: /continue shopping/i }),
    ).toBeVisible();
  });

  test("renders order review with cart items and total", async ({ page }) => {
    await setupMocks(page);
    await page.goto("/checkout");

    await expect(
      page.getByRole("heading", { name: /order review/i }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Handmade Ceramic Mug")).toBeVisible();
    // Multiple $24.99 elements exist (per-item + subtotal + order total rows)
    await expect(page.getByText("$24.99").first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: /place order & pay/i }),
    ).toBeVisible();
  });

  test("places order and transitions to payment form", async ({ page }) => {
    await setupMocks(page);
    await page.goto("/checkout");

    const placeOrderBtn = page.getByRole("button", {
      name: /place order & pay/i,
    });
    await expect(placeOrderBtn).toBeVisible({ timeout: 10_000 });
    await placeOrderBtn.click();

    // After createOrder + getClientSecret succeed, stage flips to "payment"
    await expect(
      page.getByRole("heading", { name: /payment details/i }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("completes payment and navigates to order confirmation", async ({
    page,
  }) => {
    await setupMocks(page);

    // Seed sessionStorage so CheckoutView skips the review stage
    // and loads directly into the payment stage — same as resuming an interrupted checkout.
    await page.addInitScript(() => {
      sessionStorage.setItem("checkout-order-id", "order-e2e");
      sessionStorage.setItem(
        "checkout-client-secret",
        "pi_mock_e2e_secret_mock",
      );
    });

    await page.goto("/checkout");

    // Payment form should be visible immediately (no review stage)
    const payBtn = page.getByRole("button", { name: /pay \$/i });
    await expect(payBtn).toBeVisible({ timeout: 10_000 });
    await expect(payBtn).toBeEnabled();

    await payBtn.click();

    // stripe.confirmCardPayment (mock) returns succeeded → router.push('/orders/order-e2e')
    await expect(page).toHaveURL(/\/orders\/order-e2e/, { timeout: 10_000 });
  });

  test("order appears on the orders list after checkout", async ({ page }) => {
    await setupMocks(page);
    await page.goto("/orders");

    await expect(page.getByRole("heading", { name: /my orders/i })).toBeVisible(
      { timeout: 10_000 },
    );
    await expect(page.getByText("ORD-E2E-001")).toBeVisible();
    await expect(page.getByText(/pending/i).first()).toBeVisible();
  });
});
