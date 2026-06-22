import { PactV3, MatchersV3 } from "@pact-foundation/pact";
import { resolve } from "path";

const { like, eachLike, integer } = MatchersV3;

const provider = new PactV3({
  consumer: "frontend",
  provider: "backend",
  dir: resolve(__dirname, "../../../../../pacts"),
  logLevel: "error",
});

describe("Categories API contract (consumer)", () => {
  it("GET /api/v1/categories returns a list of active categories", () => {
    return provider
      .given("at least one active category exists")
      .uponReceiving("a GET /categories request with a high limit")
      .withRequest({
        method: "GET",
        path: "/api/v1/categories",
        query: { limit: "100" },
      })
      .willRespondWith({
        status: 200,
        headers: { "Content-Type": like("application/json") },
        body: {
          data: eachLike({
            id: like("clcat456"),
            name: like("Ceramics"),
            slug: like("ceramics"),
            isActive: like(true),
            createdAt: like("2026-01-01T00:00:00.000Z"),
            updatedAt: like("2026-01-01T00:00:00.000Z"),
          }),
          meta: {
            total: integer(1),
          },
        },
      })
      .executeTest(async (mockServer) => {
        const res = await fetch(
          `${mockServer.url}/api/v1/categories?limit=100`,
        );
        expect(res.status).toBe(200);
        const json = (await res.json()) as {
          data: Array<{
            id: string;
            name: string;
            slug: string;
            isActive: boolean;
          }>;
          meta: { total: number };
        };
        expect(Array.isArray(json.data)).toBe(true);
        expect(json.data[0]).toHaveProperty("id");
        expect(json.data[0]).toHaveProperty("name");
        expect(json.data[0]).toHaveProperty("slug");
        expect(json.data[0].isActive).toBe(true);
        expect(json.meta.total).toBeGreaterThanOrEqual(1);
      });
  });
});
