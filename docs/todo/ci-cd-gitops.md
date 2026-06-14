# CI/CD & GitOps

Improvements to the build and deployment pipeline. Current state: a single monolithic CI workflow builds and pushes only the backend image; no GitOps controller is in place.

---

## Matrix CI Workflow — Build All Services

**What:** Replace the current single-service CI workflow with a matrix that detects which service changed and only builds/pushes that service's image.

**Current state:** `.github/workflows/ci.yml` always builds `apps/backend`. Other apps (`apps/frontend`, `apps/auth-service`, `apps/notification-service`, `apps/search-service`, `apps/gateway`) have no CI — their images are never built or pushed to the registry.

**Why it matters:** In a real monorepo every service needs independent build and publish. The current setup means only the backend can ever be deployed; all other services are permanently stale.

**Implementation plan:**

- Add a `detect-changes` job using `dorny/paths-filter` that outputs which service directories changed
- Parameterise the build/push job as a matrix over changed services, each with its own `Dockerfile` path and image name
- Each matrix entry: checkout → build image → push to `ghcr.io/${{ github.repository_owner }}/<service>:${{ github.sha }}`
- Lint and type-check jobs should also run only for the changed service (or run all — simpler to start)
- Keep the existing lint/type-check/test jobs for `apps/backend`; extend to the other services as they get test coverage

**References:** `.github/workflows/ci.yml`, each service's `Dockerfile`

---

## GitOps Deployment With Argo CD

**What:** Replace manual `kubectl apply` and the broken `deploy-production` CI job with a GitOps loop: CI writes the new image tag to `k8s/` manifests, Argo CD detects the change and applies it.

**Current state:** The CI `deploy-production` and `deploy-staging` jobs run `kubectl apply` directly using a `KUBECONFIG` secret that does not exist — they always fail. There is no GitOps controller watching the cluster.

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

## Immediate Quick Win — Disable Broken Deploy Jobs

Until Argo CD is set up, comment out `deploy-production` and `deploy-staging` in `.github/workflows/ci.yml` so CI passes consistently. These jobs require `KUBECONFIG` secrets and a live cluster that don't exist in the current environment.
