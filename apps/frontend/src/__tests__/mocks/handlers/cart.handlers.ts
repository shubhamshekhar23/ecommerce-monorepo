import { http, HttpResponse } from "msw";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export const cartHandlers = [
  http.get(`${API}/cart`, () =>
    HttpResponse.json({ id: "cart-1", items: [], itemCount: 0, total: 0 }),
  ),

  http.post(`${API}/cart/items`, () =>
    HttpResponse.json(
      { id: "cart-1", items: [], itemCount: 1, total: 29.99 },
      { status: 201 },
    ),
  ),

  http.delete(`${API}/cart/items/:itemId`, () =>
    HttpResponse.json({ id: "cart-1", items: [], itemCount: 0, total: 0 }),
  ),
];
