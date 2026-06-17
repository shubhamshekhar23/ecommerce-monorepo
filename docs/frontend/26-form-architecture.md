# 26 — Form Architecture

The app already uses React Hook Form + Zod. The gap is reusable form primitives — currently each form re-implements its own field layout, error display, and label association. A shared form component library eliminates this duplication.

---

## Current State

- `FormField.tsx` exists as a shared component — good foundation
- `LoginForm`, `RegisterForm`, `CheckoutForm`, `ProductForm`, `CategoryForm` each implement their own field structures
- No standardized error display across forms
- No reusable Input, Select, Checkbox, Radio components

---

## Items to Implement

### Core Primitives

- [ ] **`Input` component** — a styled, accessible input wrapper:
  ```tsx
  // src/components/Form/Input.tsx
  interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
    hint?: string;
  }
  ```
  Renders: label → input → error message (if any). Handles `aria-invalid`, `aria-describedby` linking automatically (see `15-accessibility.md`).
  - Complexity: Easy
  - File: `src/components/Form/Input.tsx`

- [ ] **`Select` component** — styled `<select>` with the same label/error/hint API as `Input`.
  - Complexity: Easy
  - File: `src/components/Form/Select.tsx`

- [ ] **`Textarea` component** — multi-line text input, same API.
  - Complexity: Easy
  - File: `src/components/Form/Textarea.tsx`

- [ ] **`Checkbox` component** — accessible checkbox with label. Label must be clickable (wraps the input or uses `htmlFor`). Shows error state.
  - Complexity: Easy
  - File: `src/components/Form/Checkbox.tsx`

- [ ] **`RadioGroup` component** — renders a group of radio options with a fieldset + legend for accessibility.
  - Complexity: Medium
  - File: `src/components/Form/RadioGroup.tsx`

- [ ] **`ErrorMessage` component** — the single source of truth for inline form error display. Renders with `role="alert"` and the correct styling:
  ```tsx
  <ErrorMessage message={error} id="email-error" />
  ```
  - Complexity: Easy
  - File: `src/components/Form/ErrorMessage.tsx`

- [ ] **`FieldGroup` / `FormSection`** — groups related fields with a heading. Useful for grouping shipping address fields or payment details:
  ```tsx
  <FieldGroup label="Shipping Address">
    <Input name="street" label="Street" />
    <Input name="city" label="City" />
  </FieldGroup>
  ```
  - Complexity: Easy
  - File: `src/components/Form/FieldGroup.tsx`

### React Hook Form Integration

- [ ] **Controller wrapper for custom components** — RHF's `<Controller>` connects custom input components to the form. Wrap each primitive with a version that accepts RHF's `control` and `name` props:
  ```tsx
  // usage in any form
  <ControlledInput control={control} name="email" label="Email address" />
  ```
  This hides the `<Controller>` boilerplate from form authors.
  - Complexity: Medium
  - File: `src/components/Form/Controlled*.tsx`

- [ ] **Refactor existing forms** — once primitives exist, refactor `LoginForm`, `RegisterForm`, `CheckoutForm`, `ProductForm`, `CategoryForm` to use the shared components. Each form becomes significantly shorter.
  - Complexity: Medium (after primitives are built)

### Validation

- [ ] **Shared Zod schemas** — move validation schemas that are used in multiple places to `src/shared/validators.ts`:
  - Email validation
  - Password strength rules
  - Phone number format
  - Postal code format
  
  Feature-specific schemas (`auth.schemas.ts`) should compose these shared schemas, not duplicate them.
  - Complexity: Easy
