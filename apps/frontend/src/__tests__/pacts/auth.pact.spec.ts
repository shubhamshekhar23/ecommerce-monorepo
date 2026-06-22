import { PactV3, MatchersV3 } from "@pact-foundation/pact";
import { resolve } from "path";

const { like } = MatchersV3;

const provider = new PactV3({
  consumer: "frontend",
  provider: "backend",
  dir: resolve(__dirname, "../../../../../pacts"),
  logLevel: "error",
});

describe("Auth API contract (consumer)", () => {
  it("POST /api/v1/auth/login returns tokens and user", () => {
    return provider
      .given(
        "a user exists with email user@example.com and password password123",
      )
      .uponReceiving("a POST login request with valid credentials")
      .withRequest({
        method: "POST",
        path: "/api/v1/auth/login",
        headers: { "Content-Type": like("application/json") },
        body: { email: "user@example.com", password: "password123" },
      })
      .willRespondWith({
        status: 200,
        headers: { "Content-Type": like("application/json") },
        body: {
          accessToken: like("eyJhbGciOiJSUzI1NiJ9.access"),
          refreshToken: like("eyJhbGciOiJSUzI1NiJ9.refresh"),
          user: {
            id: like("clusr123"),
            email: like("user@example.com"),
            firstName: like("Test"),
            lastName: like("User"),
            role: like("USER"),
            isActive: like(true),
            emailVerified: like(true),
            createdAt: like("2026-01-01T00:00:00.000Z"),
            updatedAt: like("2026-01-01T00:00:00.000Z"),
          },
        },
      })
      .executeTest(async (mockServer) => {
        const res = await fetch(`${mockServer.url}/api/v1/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "user@example.com",
            password: "password123",
          }),
        });
        expect(res.status).toBe(200);
        const json = (await res.json()) as {
          accessToken: string;
          refreshToken: string;
          user: { id: string; email: string; role: string };
        };
        expect(json).toHaveProperty("accessToken");
        expect(json).toHaveProperty("refreshToken");
        expect(json.user).toHaveProperty("id");
        expect(json.user).toHaveProperty("email");
        expect(json.user).toHaveProperty("role");
      });
  });

  it("GET /api/v1/users/me returns the authenticated user profile", () => {
    return provider
      .given("a valid access token exists for user clusr123")
      .uponReceiving("a GET /users/me request with a bearer token")
      .withRequest({
        method: "GET",
        path: "/api/v1/users/me",
        headers: { Authorization: like("Bearer eyJhbGciOiJSUzI1NiJ9.access") },
      })
      .willRespondWith({
        status: 200,
        headers: { "Content-Type": like("application/json") },
        body: {
          id: like("clusr123"),
          email: like("user@example.com"),
          firstName: like("Test"),
          lastName: like("User"),
          role: like("USER"),
          isActive: like(true),
          emailVerified: like(true),
          createdAt: like("2026-01-01T00:00:00.000Z"),
          updatedAt: like("2026-01-01T00:00:00.000Z"),
        },
      })
      .executeTest(async (mockServer) => {
        const res = await fetch(`${mockServer.url}/api/v1/users/me`, {
          headers: { Authorization: "Bearer eyJhbGciOiJSUzI1NiJ9.access" },
        });
        expect(res.status).toBe(200);
        const json = (await res.json()) as {
          id: string;
          email: string;
          role: string;
          isActive: boolean;
        };
        expect(json).toHaveProperty("id");
        expect(json).toHaveProperty("email");
        expect(json).toHaveProperty("role");
        expect(json.isActive).toBe(true);
      });
  });
});
