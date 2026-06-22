import { PactV3, MatchersV3 } from "@pact-foundation/pact";
import { resolve } from "path";

const { like, eachLike, integer, decimal } = MatchersV3;

const provider = new PactV3({
  consumer: "frontend",
  provider: "backend",
  dir: resolve(__dirname, "../../../../../pacts"),
  logLevel: "error",
});

describe("Orders API contract (consumer)", () => {
  it("GET /api/v1/orders/me returns paginated order list for the current user", () => {
    return provider
      .given("user clusr123 has at least one order")
      .uponReceiving("a GET /orders/me request for the authenticated user")
      .withRequest({
        method: "GET",
        path: "/api/v1/orders/me",
        headers: { Authorization: like("Bearer eyJhbGciOiJSUzI1NiJ9.access") },
      })
      .willRespondWith({
        status: 200,
        headers: { "Content-Type": like("application/json") },
        body: {
          data: eachLike({
            id: like("clord123"),
            orderNumber: like("ORD-2026-001"),
            userId: like("clusr123"),
            status: like("PENDING"),
            paymentStatus: like("PENDING"),
            totalPrice: decimal(24.99),
            items: eachLike({
              id: like("cloi123"),
              productId: like("clprod123"),
              productName: like("Test Product"),
              quantity: integer(1),
              price: decimal(24.99),
              subtotal: decimal(24.99),
            }),
            createdAt: like("2026-01-01T00:00:00.000Z"),
            updatedAt: like("2026-01-01T00:00:00.000Z"),
          }),
          meta: {
            total: integer(1),
            page: integer(1),
            limit: integer(20),
            pages: integer(1),
            hasMore: like(false),
          },
        },
      })
      .executeTest(async (mockServer) => {
        const res = await fetch(`${mockServer.url}/api/v1/orders/me`, {
          headers: { Authorization: "Bearer eyJhbGciOiJSUzI1NiJ9.access" },
        });
        expect(res.status).toBe(200);
        const json = (await res.json()) as {
          data: Array<{
            id: string;
            orderNumber: string;
            status: string;
            paymentStatus: string;
            totalPrice: number;
          }>;
          meta: { total: number; page: number };
        };
        expect(Array.isArray(json.data)).toBe(true);
        expect(json.data[0]).toHaveProperty("id");
        expect(json.data[0]).toHaveProperty("orderNumber");
        expect(json.data[0]).toHaveProperty("status");
        expect(json.data[0]).toHaveProperty("paymentStatus");
        expect(json.meta.total).toBeGreaterThanOrEqual(1);
      });
  });

  it("GET /api/v1/orders/:id returns a single order by ID", () => {
    return provider
      .given("order clord123 exists and belongs to user clusr123")
      .uponReceiving("a GET /orders/clord123 request")
      .withRequest({
        method: "GET",
        path: "/api/v1/orders/clord123",
        headers: { Authorization: like("Bearer eyJhbGciOiJSUzI1NiJ9.access") },
      })
      .willRespondWith({
        status: 200,
        headers: { "Content-Type": like("application/json") },
        body: {
          id: like("clord123"),
          orderNumber: like("ORD-2026-001"),
          userId: like("clusr123"),
          status: like("PENDING"),
          paymentStatus: like("PENDING"),
          totalPrice: decimal(24.99),
          items: eachLike({
            id: like("cloi123"),
            productId: like("clprod123"),
            productName: like("Test Product"),
            quantity: integer(1),
            price: decimal(24.99),
            subtotal: decimal(24.99),
          }),
          createdAt: like("2026-01-01T00:00:00.000Z"),
          updatedAt: like("2026-01-01T00:00:00.000Z"),
        },
      })
      .executeTest(async (mockServer) => {
        const res = await fetch(`${mockServer.url}/api/v1/orders/clord123`, {
          headers: { Authorization: "Bearer eyJhbGciOiJSUzI1NiJ9.access" },
        });
        expect(res.status).toBe(200);
        const json = (await res.json()) as {
          id: string;
          orderNumber: string;
          status: string;
          paymentStatus: string;
          items: Array<{ id: string; productName: string }>;
        };
        expect(json.id).toBe("clord123");
        expect(json).toHaveProperty("orderNumber");
        expect(json).toHaveProperty("status");
        expect(json).toHaveProperty("paymentStatus");
        expect(Array.isArray(json.items)).toBe(true);
      });
  });

  it("POST /api/v1/orders creates a new order from the current cart", () => {
    return provider
      .given("user clusr123 has a non-empty cart")
      .uponReceiving("a POST /orders request to create an order")
      .withRequest({
        method: "POST",
        path: "/api/v1/orders",
        headers: {
          Authorization: like("Bearer eyJhbGciOiJSUzI1NiJ9.access"),
          "X-Idempotency-Key": like("550e8400-e29b-41d4-a716-446655440000"),
        },
      })
      .willRespondWith({
        status: 201,
        headers: { "Content-Type": like("application/json") },
        body: {
          id: like("clord123"),
          orderNumber: like("ORD-2026-001"),
          userId: like("clusr123"),
          status: like("PENDING"),
          paymentStatus: like("PENDING"),
          totalPrice: decimal(24.99),
          items: eachLike({
            id: like("cloi123"),
            productId: like("clprod123"),
            productName: like("Test Product"),
            quantity: integer(1),
            price: decimal(24.99),
            subtotal: decimal(24.99),
          }),
          createdAt: like("2026-01-01T00:00:00.000Z"),
          updatedAt: like("2026-01-01T00:00:00.000Z"),
        },
      })
      .executeTest(async (mockServer) => {
        const res = await fetch(`${mockServer.url}/api/v1/orders`, {
          method: "POST",
          headers: {
            Authorization: "Bearer eyJhbGciOiJSUzI1NiJ9.access",
            "X-Idempotency-Key": "550e8400-e29b-41d4-a716-446655440000",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        });
        expect(res.status).toBe(201);
        const json = (await res.json()) as {
          id: string;
          orderNumber: string;
          status: string;
          totalPrice: number;
        };
        expect(json).toHaveProperty("id");
        expect(json).toHaveProperty("orderNumber");
        expect(json.status).toBe("PENDING");
        expect(json.totalPrice).toBeGreaterThan(0);
      });
  });
});
