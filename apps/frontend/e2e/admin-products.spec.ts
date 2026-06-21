import { test, expect } from "@playwright/test";

// ─── Mock data ────────────────────────────────────────────────────────────────
const mockAdminUser = {
  id: "admin-e2e",
  email: "admin@example.com",
  firstName: "Admin",
  lastName: "User",
  role: "ADMIN",
  isActive: true,
  emailVerified: true,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

const existingProduct = {
  id: "prod-e2e",
  name: "Ceramic Bowl",
  slug: "ceramic-bowl",
  description: "A handmade ceramic bowl",
  price: 19.99,
  cost: 8.0,
  stock: 10,
  categoryId: "cat-1",
  category: { id: "cat-1", name: "Ceramics", slug: "ceramics" },
  images: [],
  variants: [],
  isActive: true,
  avgRating: 0,
  reviewCount: 0,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

const createdProduct = {
  ...existingProduct,
  id: "prod-new",
  name: "Glass Vase",
  slug: "glass-vase",
  description: "Beautiful glass vase",
  price: 34.99,
  cost: 15.0,
  stock: 5,
};

const updatedProduct = {
  ...existingProduct,
  name: "Ceramic Bowl (Updated)",
  slug: "ceramic-bowl-updated",
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

// PaginatedProductsSchema requires meta: { total, page, limit, pages, hasMore }
const productListPage = (products: (typeof existingProduct)[]) => ({
  data: products,
  meta: {
    total: products.length,
    page: 1,
    limit: 20,
    pages: 1,
    hasMore: false,
  },
});

// ─── Setup ────────────────────────────────────────────────────────────────────
async function setupMocks(
  page: Parameters<Parameters<typeof test>[1]>[0],
  opts: {
    products?: (typeof existingProduct)[];
    productDetail?: typeof existingProduct;
  } = {},
) {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
  const { hostname } = new URL(baseUrl);

  // auth_session cookie required by Next.js middleware for /admin routes
  await page.context().addCookies([
    {
      name: "auth_session",
      value: "fake-admin-session",
      domain: hostname,
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
  ]);

  await page.addInitScript(() => {
    localStorage.setItem("accessToken", "fake-admin-token");
    localStorage.setItem("refreshToken", "fake-admin-refresh");
  });

  const products = opts.products ?? [existingProduct];

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

    // Auth
    if (path.endsWith("/users/me")) return json(mockAdminUser);
    if (path.endsWith("/auth/refresh"))
      return json({
        accessToken: "fake-admin-token",
        refreshToken: "fake-admin-refresh",
      });
    if (path.includes("/auth/logout")) return json({ success: true });

    // Categories
    if (path.includes("/categories"))
      return json({ data: mockCategories, meta: { total: 1 } });

    // Cart (loaded by Header)
    if (path.includes("/cart") && method === "GET")
      return json({
        id: "c1",
        userId: "admin-e2e",
        items: [],
        itemCount: 0,
        totalPrice: 0,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

    // Products CRUD
    if (path.match(/\/products\/[^/]+$/) && method === "GET") {
      // GET /products/{id} — used by edit page
      const detail = opts.productDetail ?? existingProduct;
      return json(detail);
    }
    if (path.match(/\/products$/) && method === "GET") {
      // GET /products?page=... — admin listing
      return json(productListPage(products));
    }
    if (path.match(/\/products$/) && method === "POST") {
      return json(createdProduct, 201);
    }
    if (path.match(/\/products\/[^/]+$/) && method === "PUT") {
      return json(updatedProduct);
    }
    if (path.match(/\/products\/[^/]+$/) && method === "DELETE") {
      return json({}, 204);
    }

    return route.continue();
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────
test.describe("Admin product CRUD", () => {
  test("lists products in the admin table", async ({ page }) => {
    await setupMocks(page);
    await page.goto("/admin/products");

    await expect(page.getByRole("heading", { name: "Products" })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("Ceramic Bowl")).toBeVisible();
    await expect(page.getByText("$19.99")).toBeVisible();
    await expect(page.getByRole("link", { name: "Edit" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Delete" })).toBeVisible();
  });

  test("creates a new product and returns to listing", async ({ page }) => {
    await setupMocks(page);
    await page.goto("/admin/products");
    await expect(page.getByRole("heading", { name: "Products" })).toBeVisible({
      timeout: 10_000,
    });

    // Navigate to create form
    await page.getByRole("link", { name: "+ Add Product" }).click();
    await expect(page).toHaveURL(/\/admin\/products\/new/);
    await expect(
      page.getByRole("heading", { name: "Create Product" }),
    ).toBeVisible({ timeout: 5_000 });

    // Fill the form
    await page.getByLabel("Name").fill("Glass Vase");
    await page.getByLabel("Price").fill("34.99");
    await page.getByLabel("Cost").fill("15.00");
    await page.getByLabel("Stock").fill("5");
    await page.getByLabel("Category").selectOption("cat-1");

    await page.getByRole("button", { name: "Create Product" }).click();

    // createProduct onSuccess → router.push('/admin/products')
    await expect(page).toHaveURL(/\/admin\/products$/, { timeout: 5_000 });
  });

  test("edits an existing product and returns to listing", async ({ page }) => {
    await setupMocks(page, { productDetail: existingProduct });
    await page.goto(`/admin/products/${existingProduct.id}/edit`);

    await expect(
      page.getByRole("heading", { name: "Edit Product" }),
    ).toBeVisible({ timeout: 10_000 });
    // Pre-filled with existing product data
    await expect(page.getByLabel("Name")).toHaveValue("Ceramic Bowl");

    // Update the name
    await page.getByLabel("Name").fill("Ceramic Bowl (Updated)");
    await page.getByRole("button", { name: "Save Changes" }).click();

    // updateProduct onSuccess → router.push('/admin/products')
    await expect(page).toHaveURL(/\/admin\/products$/, { timeout: 5_000 });
  });

  test("deletes a product after confirmation", async ({ page }) => {
    await setupMocks(page);
    await page.goto("/admin/products");
    await expect(page.getByText("Ceramic Bowl")).toBeVisible({
      timeout: 10_000,
    });

    // Click Delete → inline confirmation appears
    await page.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("Delete?")).toBeVisible();

    // Confirm deletion
    await page.getByRole("button", { name: "Yes" }).click();

    // After deletion the confirm row disappears (onSettled resets showConfirmId)
    await expect(page.getByText("Delete?")).not.toBeVisible({ timeout: 5_000 });
  });
});
