import { http, HttpResponse } from "msw";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export const productsHandlers = [
  http.get(`${API}/products/cursor`, () =>
    HttpResponse.json({
      data: [
        {
          id: "prod-1",
          name: "Test Product",
          slug: "test-product",
          price: 29.99,
          cost: 15,
          stock: 10,
          categoryId: "cat-1",
          images: [
            {
              id: "img-1",
              url: "/test.jpg",
              altText: "Test",
              isMain: true,
              order: 0,
            },
          ],
          variants: [],
          isActive: true,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ],
      meta: { limit: 20, hasMore: false, nextCursor: null },
    }),
  ),

  http.get(`${API}/products/slug/:slug`, ({ params }) =>
    HttpResponse.json({
      id: "prod-1",
      name: "Test Product",
      slug: params.slug,
      price: 29.99,
      cost: 15,
      stock: 10,
      categoryId: "cat-1",
      images: [
        {
          id: "img-1",
          url: "/test.jpg",
          altText: "Test",
          isMain: true,
          order: 0,
        },
      ],
      variants: [],
      isActive: true,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    }),
  ),
];
