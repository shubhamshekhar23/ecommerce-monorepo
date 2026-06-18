import { http, HttpResponse } from "msw";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export const authHandlers = [
  http.post(`${API}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };

    if (body.email === "test@example.com" && body.password === "password123") {
      return HttpResponse.json({
        user: {
          id: "user-1",
          email: "test@example.com",
          firstName: "Test",
          lastName: "User",
          role: "USER",
        },
        accessToken: "mock-access-token",
        refreshToken: "mock-refresh-token",
      });
    }

    return HttpResponse.json(
      { message: "Invalid credentials" },
      { status: 401 },
    );
  }),

  http.post(`${API}/auth/logout`, () => HttpResponse.json({ success: true })),
];
