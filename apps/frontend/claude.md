# CLAUDE.md

# Frontend Architecture Guide:

## Stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript (strict mode enabled)
- **Styling:** SCSS Modules
- **Server State:** TanStack Query
- **Client State:** Zustand (minimal, feature-scoped)
- **Forms:** React Hook Form + Zod
- **UI Components:** Headless / accessible primitives (Radix or similar)

---

# 1. Core Principles

1. Feature-based architecture
2. Single Responsibility per component
3. Extract logic into custom hooks
4. Prefer server state tools over manual fetching
5. Keep global state minimal
6. Strict TypeScript — no `any`
7. Keep styling modular and scoped

---

# 2. Folder Structure

```
src/
├── app/
│
├── features/
│   ├── cart/
│   │   ├── components/
│   │   │   ├── CartItem/
│   │   │   │   ├── CartItem.tsx
│   │   │   │   └── CartItem.module.scss
│   │   │   │
│   │   │   └── CartSummary/
│   │   │       ├── CartSummary.tsx
│   │   │       └── CartSummary.module.scss
│   │   │
│   │   ├── hooks/
│   │   │   └── useCart.ts
│   │   │
│   │   ├── api/
│   │   │   └── syncCart.ts
│   │   │
│   │   ├── stores/
│   │   │   └── cart.store.ts
│   │   │
│   │   ├── interfaces/
│   │   │   └── cart.interface.ts
│   │   │
│   │   └── utils/
│   │       └── cart.utils.ts
│   │
│   │
│   └── product/
│       ├── components/
│       ├── hooks/
│       ├── api/
│       ├── stores/
│       ├── interfaces/
│       └── utils/
│
├── components/                # reusable UI components
├── hooks/                     # global reusable hooks
├── store/                     # global non-domain stores only
│   └── ui.store.ts
├── interfaces/                # shared cross-feature interfaces
├── shared/                    # cross-feature infrastructure
│   ├── apiClient.ts           # axios / fetch wrapper
│   ├── queryClient.ts         # TanStack Query setup
│   ├── config.ts
│   ├── constants.ts
│   ├── helpers.ts
│   └── validators.ts
│
├── styles/                    # SCSS design tokens only
│   ├── _variables.scss
│   ├── _colors.scss
│   ├── _mixins.scss
│   └── _breakpoints.scss
│
└── assets/
```

---

# 3. Component Rules

## Preferred Size

- Ideal: 30–60 lines
- Acceptable: up to 100 lines
- Refactor at: 120+ lines

## A Component Must

- Handle one responsibility
- Not contain complex business logic
- Not contain heavy data-fetching logic inline
- Not mix multiple domains
- Have its own SCSS module

---

# 4. Extracting Logic Into Custom Hooks

## Extract When

- Component exceeds ~80 lines
- You have multiple `useEffect`s
- Logic is reusable
- Business logic mixes with UI
- State transitions become complex

## Example Structure

```

features/product/
hooks/useProducts.ts
api/getProducts.ts
components/ProductList.tsx

```

Component stays UI-focused:

```tsx
const { data, isLoading } = useProducts();
```

---

# 5. State Management Rules

## 1️⃣ Local UI State

Use `useState` inside component.

Examples:

- Toggle
- Modal open state
- Input value

---

## 2️⃣ Server State

Use TanStack Query.

Never manually manage:

- loading
- error
- caching
- re-fetching

---

## 3️⃣ Feature Domain State

If multiple components inside a feature share state:

Create a store inside that feature.

Example:

```
features/cart/cart.store.ts
```

Global store must NOT contain business domain logic.

---

## 4️⃣ Global State (Minimal)

Only:

```
store/
  auth.store.ts
  ui.store.ts
```

Global store is only for:

- Auth session
- Global UI state
- Theme

---

# 6. Type & Interface Rules

## Feature-Specific Types

Keep inside feature:

```
features/product/product.types.ts
```

## Shared Types

Move to:

```
src/types/
```

Never duplicate interfaces.

---

# 7. Data Fetching Guidelines

Always:

- Keep fetch logic inside `api/`
- Wrap queries in custom hooks
- Keep components unaware of fetch details

Example:

```
features/product/api/getProducts.ts
features/product/hooks/useProducts.ts
```

---

# 8. Styling Rules (SCSS Modules)

## Standard

Each component must have:

```
Component.tsx
Component.module.scss
```

---

## Design Tokens

Global SCSS files allowed only for:

```
styles/
  _variables.scss
  _mixins.scss
  _breakpoints.scss
  _colors.scss
```

These files contain:

- Spacing scale
- Color palette
- Typography scale
- Breakpoints
- Reusable mixins

They must NOT contain:

- Business styles
- Component-specific styling

---

## Using Tokens in Modules

Example:

```scss
@use "@/styles/variables" as *;
@use "@/styles/mixins" as *;

.card {
  padding: $spacing-md;

  &:hover {
    transform: scale(1.02);
  }
}
```

---

## SCSS Best Practices

- Avoid nesting deeper than 3 levels
- Avoid global styles except reset/layout
- Avoid `!important`
- Keep class names semantic
- Keep modules small and component-scoped

---

# 9. Index Files

Each feature exposes public API via:

```
features/product/index.ts
```

Only export:

- Public components
- Public hooks

Hide internal helpers.

---

# 10. Refactoring Triggers

Refactor immediately if:

- Component > 120 lines
- More than 2 `useEffect`s
- Complex conditional rendering
- Hard to test
- Business logic mixes with JSX

---

# 11. Naming Conventions

Components:

- PascalCase

Hooks:

- useSomething

Stores:

- useFeatureStore

Interfaces:

- FeatureEntity

SCSS:

- Component.module.scss

---

# 12. What We Avoid

- Mega global store
- 200+ line components
- Business logic inside UI
- Fetching inside `useEffect`
- `any` types
- Cross-feature deep imports
- Global SCSS business styles

---

# 13. Architectural Goal

Each feature should be:

- Self-contained
- Testable in isolation
- Replaceable
- Scalable

Features own:

- Components
- Hooks
- API layer
- Types
- Store (if needed)
- SCSS Modules

---

# Final Philosophy

Keep components small.  
Keep logic in hooks.  
Keep state where it belongs.  
Keep styles modular.  
Keep features isolated.  
Keep global minimal.
