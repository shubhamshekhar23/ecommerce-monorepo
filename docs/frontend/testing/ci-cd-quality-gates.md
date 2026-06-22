# 17 — CI/CD Quality Gates

Tests and linting only protect the codebase if they're enforced automatically. Every item here is a gate that blocks a merge to main if it fails.

---

## Current State

The monorepo already has a CI matrix workflow (`paths-filter` on all 5 services). The frontend CI job needs these gates added to it.

---

## Items to Implement

### Static Analysis Gates

- [x] **TypeScript type-check** — run `tsc --noEmit` as a CI step. Catches type errors that ESLint misses. Currently the dev server may ignore type errors; CI must not.
  - Command: `npx tsc --noEmit`
  - Complexity: Easy

- [x] **ESLint** — run `eslint src/` in CI. Include the `eslint-plugin-jsx-a11y` rules from `15-accessibility.md`. Zero warnings allowed (use `--max-warnings 0`).
  - Command: `npx eslint src/ --max-warnings 0`
  - Complexity: Easy

- [x] **Stylelint** — run `stylelint "src/**/*.scss"` in CI once `.stylelintrc.json` is set up (from `01-project-structure.md`).
  - Command: `npx stylelint "src/**/*.scss"`
  - Complexity: Easy (depends on stylelint setup)

- [x] **Prettier format check** — `prettier --check "src/**/*.{ts,tsx,scss}"` to ensure code is formatted. Fail if any file doesn't match.
  - Complexity: Easy

### Test Gates

- [x] **Unit + component tests** — run Jest in CI. Fail if any test fails.
  - Command: `npx jest --ci --coverage`
  - Complexity: Easy

- [x] **Coverage threshold** — enforce minimum coverage in `jest.config.ts`:
  ```ts
  coverageThreshold: {
    global: { branches: 70, functions: 70, lines: 70, statements: 70 }
  }
  ```
  Start at 70%, raise as coverage improves. CI fails if coverage drops below threshold.
  - Complexity: Easy

- [x] **E2E tests in CI** — run Playwright tests against a test environment build. Use `@playwright/test` with `webServer` config to spin up `next build && next start` before running tests.
  - Complexity: Medium (needs CI environment setup)

- [x] **Accessibility audit in CI** — run `axe` scans via Playwright against key pages (`/`, `/products`, `/products/[slug]`, `/cart`). Fail if any critical or serious A11Y violations are found.
  - Tool: `@axe-core/playwright`
  - Complexity: Medium

### Build & Bundle Gates

- [x] **Build verification** — `next build` must succeed with zero errors. Any TypeScript error or import issue that slips past type-check will fail here.
  - Command: `npx next build`
  - Complexity: Easy

- [x] **Bundle size check** — set a budget for JS bundle size. Fail CI if any page's bundle exceeds it. Prevents accidental import of large libraries.
  - Tool: `bundlesize` or Next.js built-in bundle analyzer (`@next/bundle-analyzer`) + a custom size check script
  - Budget example: main page bundle < 150kb gzipped
  - Complexity: Medium

- [ ] **`@next/bundle-analyzer` for manual inspection** — not a CI gate but a dev tool. Run `ANALYZE=true npm run build` to see a visual bundle composition breakdown. Use to identify what's making bundles large.
  - Complexity: Easy (config + npm script)
  - File: `next.config.js`

### Security & Dependency Gates

- [x] **`npm audit`** — run `npm audit --audit-level=high` in CI. Fails if any high or critical severity vulnerability is found in dependencies.
  - Complexity: Easy

- [x] **Dependabot or Renovate** — auto-open PRs when dependencies have new versions or security patches. Configure in `.github/dependabot.yml`.
  - Complexity: Easy (config file)

### Performance Gate

- [ ] **Lighthouse CI** — run Lighthouse against the built app in CI and enforce score thresholds:
  - Performance: ≥ 80
  - Accessibility: ≥ 90
  - Best Practices: ≥ 90
  - SEO: ≥ 90
  
  Use `@lhci/cli` (Lighthouse CI):
  ```yaml
  - name: Run Lighthouse CI
    uses: treosh/lighthouse-ci-action@v10
  ```
  - Complexity: Medium

### CI Workflow Structure

- [x] **Parallel job structure in GitHub Actions** — organize the CI workflow so fast gates (type-check, lint, format) run in parallel, and slower gates (build, E2E, Lighthouse) run after fast gates pass. Minimizes wall-clock time:
  ```
  [lint + typecheck + format] → parallel
        ↓ (if all pass)
  [unit tests]
        ↓
  [build]
        ↓
  [E2E + Lighthouse + bundle check] → parallel
  ```
  - Complexity: Medium
  - File: `.github/workflows/frontend.yml`
