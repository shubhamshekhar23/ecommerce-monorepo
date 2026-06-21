/**
 * Integration test: product category filter.
 * Renders ProductsView (which composes CategorySidebar + ProductGrid) with
 * mocked hooks and a controllable useSearchParams.
 *
 * Verifies:
 *   - All products shown when no category filter is active
 *   - Clicking a category calls router.push with ?category=<slug>
 *   - When ?category=<slug> is active, only matching products are shown
 *   - Page title reflects the active category
 *   - "All" button clears the category filter
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ProductsView } from "@/features/products";
import { Product, Category } from "@/features/products/interfaces";

// ─── Mutable search-params mock ──────────────────────────────────────────────
let mockSearchParams = new URLSearchParams();
const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => "/en/products",
  useSearchParams: () => mockSearchParams,
  useParams: () => ({}),
}));

// ─── Product hook mocks ───────────────────────────────────────────────────────
jest.mock("@/features/products/hooks", () => ({
  useCategories: jest.fn(),
  useProductsCursor: jest.fn(),
  useProductSearch: jest.fn(),
}));

jest.mock("@/features/products/hooks/useProductListCache", () => ({
  useProductListCache: jest.fn(),
}));

/* eslint-disable @typescript-eslint/no-require-imports */
const hooksModule = require("@/features/products/hooks");
/* eslint-enable @typescript-eslint/no-require-imports */
const useCategories = hooksModule.useCategories as jest.Mock;
const useProductsCursor = hooksModule.useProductsCursor as jest.Mock;
const useProductSearch = hooksModule.useProductSearch as jest.Mock;

// ─── Fixtures ─────────────────────────────────────────────────────────────────
const makeProduct = (
  id: string,
  name: string,
  categoryId: string,
): Product => ({
  id,
  name,
  slug: name.toLowerCase().replace(/\s+/g, "-"),
  description: "A product",
  price: 10,
  cost: 5,
  stock: 10,
  categoryId,
  images: [],
  variants: [],
  isActive: true,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
});

const categories: Category[] = [
  { id: "cat-ceramics", name: "Ceramics", slug: "ceramics", productCount: 2 },
  { id: "cat-glass", name: "Glassware", slug: "glassware", productCount: 1 },
];

const ceramicMug = makeProduct("p-1", "Ceramic Mug", "cat-ceramics");
const ceramicBowl = makeProduct("p-2", "Ceramic Bowl", "cat-ceramics");
const glassVase = makeProduct("p-3", "Glass Vase", "cat-glass");

const allProducts = [ceramicMug, ceramicBowl, glassVase];
const ceramicProducts = [ceramicMug, ceramicBowl];

function makeCursorResult(products: Product[]) {
  return {
    data: {
      pages: [
        {
          data: products,
          meta: { hasMore: false, total: products.length, nextCursor: null },
        },
      ],
      pageParams: [undefined],
    },
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    isLoading: false,
    error: null,
  };
}

function makeCategoriesResult(cats: Category[]) {
  return { data: { data: cats }, isLoading: false, error: null };
}

function renderView() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ProductsView />
    </QueryClientProvider>,
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("ProductsView — category filter integration", () => {
  beforeEach(() => {
    mockSearchParams = new URLSearchParams();
    mockPush.mockClear();
    useCategories.mockClear();
    useProductsCursor.mockClear();
    useProductSearch.mockClear();

    useCategories.mockReturnValue(makeCategoriesResult(categories));
    useProductSearch.mockReturnValue({ data: undefined, isLoading: false });
    // Default: no filter → all products
    useProductsCursor.mockReturnValue(makeCursorResult(allProducts));
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("shows all products when no category filter is active", () => {
    renderView();
    expect(screen.getByText(ceramicMug.name)).toBeInTheDocument();
    expect(screen.getByText(ceramicBowl.name)).toBeInTheDocument();
    expect(screen.getByText(glassVase.name)).toBeInTheDocument();
  });

  it("renders the category list in the sidebar", () => {
    renderView();
    expect(
      screen.getByRole("button", { name: "Ceramics" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Glassware" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
  });

  it("calls router.push with ?category=ceramics when Ceramics is clicked", async () => {
    const user = userEvent.setup();
    renderView();
    await user.click(screen.getByRole("button", { name: "Ceramics" }));
    expect(mockPush).toHaveBeenCalledWith("/en/products?category=ceramics");
  });

  it("calls router.push without category param when All is clicked", async () => {
    const user = userEvent.setup();
    mockSearchParams = new URLSearchParams("category=ceramics");
    // With active category filter, useProductsCursor returns ceramic products
    useProductsCursor.mockReturnValue(makeCursorResult(ceramicProducts));
    renderView();
    await user.click(screen.getByRole("button", { name: "All" }));
    expect(mockPush).toHaveBeenCalledWith("/en/products");
  });

  it("shows only Ceramics products when ?category=ceramics is active", () => {
    mockSearchParams = new URLSearchParams("category=ceramics");
    useProductsCursor.mockImplementation((_enabled, filters) => {
      const products =
        filters?.categoryId === "cat-ceramics" ? ceramicProducts : allProducts;
      return makeCursorResult(products);
    });
    renderView();
    expect(screen.getByText(ceramicMug.name)).toBeInTheDocument();
    expect(screen.getByText(ceramicBowl.name)).toBeInTheDocument();
    expect(screen.queryByText(glassVase.name)).not.toBeInTheDocument();
  });

  it("updates the page title to the active category name", () => {
    mockSearchParams = new URLSearchParams("category=ceramics");
    useProductsCursor.mockReturnValue(makeCursorResult(ceramicProducts));
    renderView();
    expect(
      screen.getByRole("heading", { name: "Ceramics" }),
    ).toBeInTheDocument();
  });

  it("passes categoryId to useProductsCursor when category is active", () => {
    mockSearchParams = new URLSearchParams("category=glassware");
    useProductsCursor.mockReturnValue(makeCursorResult([glassVase]));
    renderView();
    // Check the last call — React may render multiple times due to useDeferredValue.
    // Second argument is deferredFilters — should contain the resolved categoryId.
    const lastCall = useProductsCursor.mock.calls.at(-1);
    expect(lastCall?.[1]).toMatchObject({ categoryId: "cat-glass" });
  });
});
