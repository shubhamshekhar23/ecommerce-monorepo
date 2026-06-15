# CI/CD & GitOps

Improvements to the build and deployment pipeline. Current state: a single monolithic CI workflow builds and pushes only the backend image; no GitOps controller is in place.

---

## Matrix CI Workflow — Build All Services ✅ Done (2026-06-15)

**What:** Replace the current single-service CI workflow with a matrix that detects which service changed and only builds/pushes that service's image.

**Status:** Implemented. `detect-changes` job uses `dorny/paths-filter` to output which services changed (including shared-types propagation). `build` job is a matrix over all 5 services, skipping unchanged ones. Each service gets its own GHA cache scope. Broken `deploy-staging` / `deploy-production` jobs removed — replaced with a comment explaining the Argo CD plan.

**Previous state:** `.github/workflows/ci.yml` always built `apps/backend`. Other apps had no CI.

**Why it matters:** In a real monorepo every service needs independent build and publish. The current setup means only the backend can ever be deployed; all other services are permanently stale.

**Implementation plan:**

- Add a `detect-changes` job using `dorny/paths-filter` that outputs which service directories changed
- Parameterise the build/push job as a matrix over changed services, each with its own `Dockerfile` path and image name
- Each matrix entry: checkout → build image → push to `ghcr.io/${{ github.repository_owner }}/<service>:${{ github.sha }}`
- Lint and type-check jobs should also run only for the changed service (or run all — simpler to start)
- Keep the existing lint/type-check/test jobs for `apps/backend`; extend to the other services as they get test coverage

**References:** `.github/workflows/ci.yml`, each service's `Dockerfile`

---

## GitOps Deployment With Argo CD ✅ Done (partial, 2026-06-15)

**What:** Replace manual `kubectl apply` and the broken `deploy-production` CI job with a GitOps loop: CI writes the new image tag to `k8s/` manifests, Argo CD detects the change and applies it.

**Status:** Manifests committed. `k8s/argocd/app-of-apps.yaml` defines the parent Application. `k8s/argocd/apps/` contains one Application per service pointing at the relevant `k8s/base/<service>` path. Broken deploy jobs removed from `ci.yml`.

**To activate (requires a cluster):**
1. `kubectl create namespace argocd`
2. `kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml`
3. `kubectl apply -f k8s/argocd/app-of-apps.yaml`

Argo CD will then reconcile all services automatically on every push to main.

**Previous state:** The CI `deploy-production` and `deploy-staging` jobs ran `kubectl apply` directly using a `KUBECONFIG` secret that did not exist — they always failed.

**Why it matters:** Direct-apply CI is fragile and stateless. GitOps makes the cluster state auditable and self-healing — the cluster always converges to what is in git.

**Implementation plan:**

- Install Argo CD in the cluster (`argocd` namespace)
- Create an `Application` CRD pointing at the `k8s/` directory in this repo
- Update CI to write the new image tag into `k8s/<service>/deployment.yaml` (using `kustomize edit set image` or `sed`) and commit/push — Argo CD then reconciles
- Comment out or remove the current `deploy-production` and `deploy-staging` jobs from `ci.yml` (they will never pass without a real cluster and should not fail the pipeline)
- Add Argo CD app-of-apps or ApplicationSet to manage all services from a single parent app
- Optional: add `argocd app sync --prune` to CI as a sync trigger rather than waiting for the default 3-minute poll

**References:** `.github/workflows/ci.yml`, `k8s/`, Argo CD app-of-apps pattern

---

## Service Dockerfile Cleanup — Align With Backend's 3-Stage Pattern ✅ Done (2026-06-15)

**What:** Rewrite the four service Dockerfiles (`auth-service`, `gateway`, `notification-service`, `search-service`) to match the backend's proven 3-stage build pattern (`deps` → `builder` → `runner`) instead of the current fragile workaround.

**Status:** All four Dockerfiles rewritten. Each now uses `deps` (full `npm ci` with all workspace manifests + native tools) → `builder` (compile TypeScript, no build tools) → `runner` (lean, dumb-init, non-root user). `auth-service` includes `prisma generate` in both deps and builder stages. All four standardise on `WORKDIR /app`.

**Current state (fragile):** The four service Dockerfiles use a combination of:
- Workspace-scoped `npm install --workspace=X --ignore-scripts` to avoid postinstall conflicts
- Merging workspace-local `node_modules` into root in the runner stage to fix module resolution
- An explicit `npm rebuild bcrypt --build-from-source` step for auth-service

This works but is brittle — any change to `package-lock.json` (adding a dependency, upgrading a package) can silently break hoisting again, causing missing-module errors at container startup.

**Why it's fragile:** npm's hoisting decisions are encoded in `package-lock.json`, which was generated on the host with the full monorepo including the frontend. The lockfile places some packages (`reflect-metadata`, `bcrypt` native binding) at workspace level rather than root. The current Dockerfiles paper over this with a merge step. If the lockfile changes, the merge may no longer cover all affected packages.

**The right fix:** Follow the backend's approach exactly:
- Use a `deps` stage that runs `npm ci` (full install, not workspace-scoped) — this installs everything in the way the lockfile prescribes and the runner copies only what's needed
- Use a `builder` stage that compiles TypeScript, runs `prisma generate` (for auth-service), and builds the dist
- Use a lean `runner` stage that copies `node_modules` and `dist` from the prior stages

**Why this works:** `npm ci` (full install) installs all packages at their lockfile-specified locations. Copying the full root `node_modules` to the runner means every package is at root — no workspace-level split, no merge hacks needed. The backend has been running this way reliably.

**Additional fix:** Regenerate `package-lock.json` from scratch after adding the `apps/frontend` workspace exclusion where appropriate, so hoisting decisions in the lockfile are predictable.

**References:** `apps/backend/Dockerfile` (reference implementation), `apps/auth-service/Dockerfile`, `apps/gateway/Dockerfile`, `apps/notification-service/Dockerfile`, `apps/search-service/Dockerfile`

---

## Immediate Quick Win — Disable Broken Deploy Jobs

Until Argo CD is set up, comment out `deploy-production` and `deploy-staging` in `.github/workflows/ci.yml` so CI passes consistently. These jobs require `KUBECONFIG` secrets and a live cluster that don't exist in the current environment.
