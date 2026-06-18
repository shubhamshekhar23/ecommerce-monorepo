export const PRODUCTS_PAGE_SIZE = 20;
export const PRODUCTS_CARD_HEIGHT_PX = 320;
export const PRODUCTS_SEARCH_DEBOUNCE_MS = 300;
export const PRODUCTS_MAX_RECENT_SEARCHES = 10;
export const PRODUCTS_SORT_STORAGE_KEY = "products-sort-order";
export const PRODUCTS_SCROLL_STORAGE_KEY = "products-scroll";

export const PRODUCTS_SORT_OPTIONS = [
  { label: "Newest", value: "newest" },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
  { label: "Oldest", value: "oldest" },
] as const;
