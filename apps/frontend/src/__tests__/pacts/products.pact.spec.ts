import { PactV3, MatchersV3 } from "@pact-foundation/pact";
import { resolve } from "path";

const { like, eachLike, integer } = MatchersV3;

/*
 - Consumer contract: frontend's expectation of the backend GET /api/v1/products response.
 - Running this test generates pacts/frontend-backend.json at the repo root.
 - The backend provider verification (apps/backend/test/pact/) reads that file to confirm
 - the provider still satisfies these expectations.
 */
const provider = new PactV3({
  consumer: "frontend",
  provider: "backend",
  dir: resolve(__dirname, "../../../../../pacts"),
  logLevel: "error",
});

describe("Products API contract (consumer)", () => {
  it("GET /api/v1/products returns paginated product list with rating fields", () => {
    return provider
      .given("products exist")
      .uponReceiving("a GET request for the product listing")
      .withRequest({
        method: "GET",
        path: "/api/v1/products",
      })
      .willRespondWith({
        status: 200,
        headers: { "Content-Type": like("application/json") },
        body: {
          data: eachLike({
            id: like("clprod123"),
            name: like("Test Product"),
            slug: like("test-product"),
            categoryId: like("clcat456"),
            isActive: like(true),
            avgRating: like(null),
            reviewCount: integer(0),
            priceRange: { min: like(9.99), max: like(9.99) },
            createdAt: like("2026-06-16T00:00:00.000Z"),
            updatedAt: like("2026-06-16T00:00:00.000Z"),
          }),
          total: integer(1),
          page: integer(1),
          limit: integer(20),
        },
      })
      .executeTest(async (mockServer) => {
        const res = await fetch(`${mockServer.url}/api/v1/products`);
        expect(res.status).toBe(200);
        const json = (await res.json()) as {
          data: Array<{
            id: string;
            name: string;
            avgRating: number | null;
            reviewCount: number;
          }>;
          total: number;
          page: number;
          limit: number;
        };
        expect(Array.isArray(json.data)).toBe(true);
        expect(json.data[0]).toHaveProperty("id");
        expect(json.data[0]).toHaveProperty("name");
        expect(json.data[0]).toHaveProperty("avgRating");
        expect(json.data[0]).toHaveProperty("reviewCount");
        expect(json.total).toBeGreaterThanOrEqual(1);
      });
  });
});
