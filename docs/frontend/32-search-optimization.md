# 32 — Search Optimization

The product search currently fires a full-text search API call. This file covers the UX patterns that make search feel fast and helpful.

---

## Current State

- `useProductSearch` hook fires on the `search` URL param
- `ProductsView` shows results or the browse view depending on whether a search term is present
- No debouncing on the input (see `08-user-experience.md`)
- No search history, no suggestions, no empty state

---

## Items to Implement

- [ ] **Search input debounce** — already tracked in `08-user-experience.md`. The search should not fire on every keystroke. Debounce by 300ms.
  - Complexity: Easy (covered in 08)

- [ ] **Search history with `localStorage`** — save the last 5–10 search terms when the user submits a search. Show them as recent searches when the user focuses the search input with an empty value:
  ```ts
  const savedSearches = localStorage.getItem('recent-searches');
  // Save on submit:
  const recent = [term, ...existing].slice(0, 10);
  localStorage.setItem('recent-searches', JSON.stringify(recent));
  ```
  - Complexity: Easy
  - File: `src/components/Header/Header.tsx` or wherever the search input lives

- [ ] **Search suggestions / autocomplete** — as the user types, show a dropdown of matching product names. Options:
  - Query the products search endpoint with `?search=<partial>` (already exists — just add a dropdown UI)
  - Use a dedicated `/products/suggestions` endpoint if the backend supports it (faster, fewer fields returned)
  - Show: product name + category + thumbnail
  - Complexity: Medium

- [ ] **Highlight matched terms in results** — when showing search results, bold/highlight the matched portion of the product name:
  ```tsx
  function highlightMatch(text: string, query: string) {
    const index = text.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) return text;
    return (
      <>
        {text.slice(0, index)}
        <mark>{text.slice(index, index + query.length)}</mark>
        {text.slice(index + query.length)}
      </>
    );
  }
  ```
  - Complexity: Easy

- [ ] **Empty search results state** — when a search returns 0 results, show a helpful empty state (not a blank page):
  - "No results for 'blue suede shoes'"
  - Suggestions: "Try a different spelling" or "Browse all products"
  - CTA: "Clear search" button that resets to browse mode
  - Complexity: Easy
  - File: `src/features/products/components/ProductGrid/ProductGrid.tsx`

- [ ] **No-query empty state** — when the search input is cleared and the user is back to browse mode with 0 loaded products (edge case), show a "No products found" state with a CTA. Tracked in `33-empty-states-loading.md`.
  - Complexity: Easy

- [ ] **Search input keyboard accessibility** — the search input should:
  - Close suggestions on `Escape`
  - Navigate suggestions with arrow keys
  - Submit on `Enter`
  - Trap focus within the suggestion dropdown when open
  - Complexity: Medium
  - Connection: `15-accessibility.md` (keyboard navigation)
