import { PactV3, MatchersV3 } from "@pact-foundation/pact";
import { resolve } from "path";

const { like, integer, decimal } = MatchersV3;

const provider = new PactV3({
  consumer: "frontend",
  provider: "backend",
  dir: resolve(__dirname, "../../../../../pacts"),
  logLevel: "error",
});

describe("Cart API contract (consumer)", () => {
  it("GET /api/v1/cart returns the user's cart with items", () => {
    return provider
      .given("a cart exists for user clusr123 with one item")
      .uponReceiving("a GET /cart request for an authenticated user")
      .withRequest({
        method: "GET",
        path: "/api/v1/cart",
        headers: { Authorization: like("Bearer eyJhbGciOiJSUzI1NiJ9.access") },
      })
      .willRespondWith({
        status: 200,
        headers: { "Content-Type": like("application/json") },
        body: {
          id: like("clcart123"),
          userId: like("clusr123"),
          items: [
            {
              id: like("clitem123"),
              productId: like("clprod123"),
              product: {
                id: like("clprod123"),
                name: like("Test Product"),
                slug: like("test-product"),
                price: decimal(24.99),
                cost: decimal(12.0),
                stock: integer(10),
                categoryId: like("clcat456"),
                isActive: like(true),
                createdAt: like("2026-01-01T00:00:00.000Z"),
                updatedAt: like("2026-01-01T00:00:00.000Z"),
              },
              quantity: integer(1),
              subtotal: decimal(24.99),
            },
          ],
          itemCount: integer(1),
          totalPrice: decimal(24.99),
          createdAt: like("2026-01-01T00:00:00.000Z"),
          updatedAt: like("2026-01-01T00:00:00.000Z"),
        },
      })
      .executeTest(async (mockServer) => {
        const res = await fetch(`${mockServer.url}/api/v1/cart`, {
          headers: { Authorization: "Bearer eyJhbGciOiJSUzI1NiJ9.access" },
        });
        expect(res.status).toBe(200);
        const json = (await res.json()) as {
          id: string;
          items: Array<{ id: string; quantity: number; subtotal: number }>;
          itemCount: number;
          totalPrice: number;
        };
        expect(json).toHaveProperty("id");
        expect(Array.isArray(json.items)).toBe(true);
        expect(json.items[0]).toHaveProperty("id");
        expect(json.items[0]).toHaveProperty("quantity");
        expect(json.itemCount).toBeGreaterThanOrEqual(1);
      });
  });

  it("POST /api/v1/cart/items adds a product and returns the updated cart", () => {
    return provider
      .given("product clprod123 exists and is in stock")
      .uponReceiving("a POST /cart/items request to add a product")
      .withRequest({
        method: "POST",
        path: "/api/v1/cart/items",
        headers: {
          Authorization: like("Bearer eyJhbGciOiJSUzI1NiJ9.access"),
          "Content-Type": like("application/json"),
        },
        body: { productId: "clprod123", quantity: 1 },
      })
      .willRespondWith({
        status: 200,
        headers: { "Content-Type": like("application/json") },
        body: {
          id: like("clcart123"),
          userId: like("clusr123"),
          items: [
            {
              id: like("clitem123"),
              productId: like("clprod123"),
              product: {
                id: like("clprod123"),
                name: like("Test Product"),
                slug: like("test-product"),
                price: decimal(24.99),
                cost: decimal(12.0),
                stock: integer(10),
                categoryId: like("clcat456"),
                isActive: like(true),
                createdAt: like("2026-01-01T00:00:00.000Z"),
                updatedAt: like("2026-01-01T00:00:00.000Z"),
              },
              quantity: integer(1),
              subtotal: decimal(24.99),
            },
          ],
          itemCount: integer(1),
          totalPrice: decimal(24.99),
          createdAt: like("2026-01-01T00:00:00.000Z"),
          updatedAt: like("2026-01-01T00:00:00.000Z"),
        },
      })
      .executeTest(async (mockServer) => {
        const res = await fetch(`${mockServer.url}/api/v1/cart/items`, {
          method: "POST",
          headers: {
            Authorization: "Bearer eyJhbGciOiJSUzI1NiJ9.access",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ productId: "clprod123", quantity: 1 }),
        });
        expect(res.status).toBe(200);
        const json = (await res.json()) as {
          id: string;
          items: Array<{ productId: string; quantity: number }>;
          itemCount: number;
        };
        expect(json).toHaveProperty("id");
        expect(json.items[0].productId).toBe("clprod123");
        expect(json.itemCount).toBeGreaterThanOrEqual(1);
      });
  });
});
