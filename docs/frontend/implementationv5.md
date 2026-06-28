# 30 — Route Layer Refactoring

The `app/` directory in Next.js App Router is a routing layer, not a feature layer. A `page.tsx` should only own what Next.js forces it to own: URL params, `metadata`/`generateMetadata`, `generateStaticParams`, and composing feature components. Data fetching, loading/error states, `useState`, and mutation handlers belong inside the feature.

---

## The Pattern

**Before:**
```tsx
// app/[locale]/admin/products/[id]/edit/page.tsx — ❌ too much
export default function Page() {
  const { id } = useParams();
  const { data, isLoading, error } = useAdminProduct(id);
  const [tab, setTab] = useState<Tab>("details");
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState />;
  return <ProductForm product={data} />;
}
```

**After:**
```tsx
// app/[locale]/admin/products/[id]/edit/page.tsx — ✅ routing only
import { EditProductPage } from "@/features/admin";
export default function Page({ params }: { params: { id: string } }) {
  return <EditProductPage productId={params.id} />;
}

// features/admin/pages/EditProductPage.tsx — owns all logic
export function EditProductPage({ productId }: { productId: string }) {
  const { data, isLoading, error } = useAdminProduct(productId);
  const [tab, setTab] = useState<Tab>("details");
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState />;
  return <ProductForm product={data} />;
}
```

New page-level components live in `features/<domain>/pages/` and are exported from the feature's `index.ts`.

---

## Items to Implement

### Admin — Edit Pages

- [x] **`EditProductPage`** — extract from `admin/products/[id]/edit/page.tsx`
  - Contains: `useAdminProduct`, tab `useState`, loading/error guards, tab rendering
  - Target: `features/admin/pages/EditProductPage.tsx`
  - Complexity: Easy

- [x] **`EditCategoryPage`** — extract from `admin/categories/[id]/edit/page.tsx`
  - Contains: `useAdminCategory`, loading/error/not-found guards
  - Target: `features/admin/pages/EditCategoryPage.tsx`
  - Complexity: Easy

- [x] **`EditPromotionRulePage`** — extract from `admin/promotion-rules/[id]/edit/page.tsx`
  - Contains: data hook, loading/error guards, mutation handler, form value transformation
  - Target: `features/admin/pages/EditPromotionRulePage.tsx`
  - Complexity: Easy

- [x] **`NewPromotionRulePage`** — extract from `admin/promotion-rules/new/page.tsx`
  - Contains: `useRouter`, mutation handler, form transformation, navigation side effect
  - Target: `features/admin/pages/NewPromotionRulePage.tsx`
  - Complexity: Easy

### Admin — Heavy Pages

- [x] **`PromotionRulesPage`** — extract from `admin/promotion-rules/page.tsx`
  - Contains: `usePromotionRules`, `useUpdatePromotionRule`, `useDeletePromotionRule`, toggle mutation handler, full table rendering — 70+ lines
  - Target: `features/admin/pages/PromotionRulesPage.tsx`
  - Complexity: Easy

- [x] **`FeatureFlagsPage`** — extract from `admin/feature-flags/page.tsx`
  - Contains: `useState` (showForm, deleteConfirm), react-hook-form, Zod schema, mutation handlers — 200+ lines
  - Target: `features/admin/pages/FeatureFlagsPage.tsx`
  - Complexity: Medium

- [x] **`QueuePage`** — extract from `admin/queue/page.tsx`
  - Contains: multiple `useState`, `useQueueStats`, `useDlqJobs`, retry/clear handlers — 177 lines
  - Target: `features/admin/pages/QueuePage.tsx`
  - Complexity: Medium

- [x] **`ReturnsPage`** — extract from `admin/returns/page.tsx`
  - Contains: tab state, rejection modal state, filtering logic, mutation handlers — 174 lines
  - Target: `features/admin/pages/ReturnsPage.tsx`
  - Complexity: Medium

- [x] **`DbAnalyticsPage`** — extract from `admin/db-analytics/page.tsx`
  - Contains: 5+ hooks, mutation handlers, colour logic — 250 lines
  - Target: `features/admin/pages/DbAnalyticsPage.tsx`
  - Complexity: Medium

### Account Pages

- [x] **`SecurityPage`** — extract from `account/security/page.tsx`
  - Contains: multi-step 2FA state machine, 4 `useState` hooks — 182 lines
  - Target: `features/account/pages/SecurityPage.tsx`
  - Complexity: Medium

- [x] **`AddressesPage`** — extract from `account/addresses/page.tsx`
  - Contains: `useState` (showNew), `useAddresses`, `useCreateAddress`, form submission
  - Target: `features/account/pages/AddressesPage.tsx`
  - Complexity: Easy

- [x] **`PrivacyPage`** — extract from `account/privacy/page.tsx`
  - Contains: `useState` (confirmOpen), auth store subscription, deletion mutation
  - Target: `features/account/pages/PrivacyPage.tsx`
  - Complexity: Easy

### Auth Pages

- [x] **`ForgotPasswordPage`** — extract from `(auth)/forgot-password/page.tsx`
  - Contains: `useState` (submitted), mutation handler, conditional success/form rendering
  - Target: `features/auth/pages/ForgotPasswordPage.tsx`
  - Complexity: Easy

- [x] **`ResetPasswordPage`** — extract from `(auth)/reset-password/page.tsx`
  - Contains: `useState`, `useSearchParams` for token, mutation handler, error states
  - Target: `features/auth/pages/ResetPasswordPage.tsx`
  - Complexity: Easy

### Orders

- [x] **`ReturnOrderPage`** — extract from `orders/[id]/return/page.tsx`
  - Contains: `useState`, mutation handler, form submission
  - Target: `features/returns/pages/ReturnOrderPage.tsx`
  - Complexity: Easy

### Storefront

- [x] **`ProductDetailPage`** — extract from `products/[slug]/page.tsx`
  - Contains: server-side data fetch, JSON-LD schema building, availability logic
  - Target: `features/products/pages/ProductDetailPage.tsx`
  - Complexity: Medium
  - Note: keep `generateMetadata` and `generateStaticParams` in `page.tsx` — those are genuine routing concerns

---

## Where to Put the New Pages

Follow the feature directory the page belongs to:

- Admin pages → `features/admin/pages/`
- Account pages → `features/account/pages/`
- Auth pages → `features/auth/pages/`
- Order pages → `features/orders/pages/`
- Product pages → `features/products/pages/`

Export each from the feature's `index.ts`.

---

## Total Effort

- 11 × ~20 min pages = ~4 hrs
- 4 × ~45 min pages = ~3 hrs
- 2 × ~90 min pages = ~3 hrs
- **Total: ~10 hours**

Purely mechanical — no logic changes, no behaviour change. Risk is low. Prioritise the admin edit pages first since that area is actively being developed.
