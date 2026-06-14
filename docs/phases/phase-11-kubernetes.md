# Phase 11 — Kubernetes

**Status:** ✅ Done

---

## What Was Built

Every previous phase orchestrated services with Docker Compose — one node, one daemon, imperative commands. Phase 11 introduces Kubernetes: a declarative cluster orchestrator that continuously reconciles desired state with actual state. You declare "I want 3 replicas of backend" and a control loop makes that true and keeps it true.

### Directory structure

```
k8s/
├── base/           # Canonical manifests — shared by all environments
│   ├── infra/      # StatefulSets: postgres, redis, rabbitmq, opensearch + pgbouncer Deployment
│   ├── backend/    # Deployment + Service + HPA
│   ├── auth-service/
│   ├── gateway/    # Public entry point — Ingress routes all traffic here
│   ├── search-service/
│   ├── notification-service/
│   ├── ingress/    # NGINX Ingress Controller rules (replaces nginx container)
│   ├── monitoring/ # Prometheus + Grafana Deployments, ConfigMaps from existing files
│   └── jobs/       # prisma-migrate Job template
└── overlays/
    ├── local/      # kind cluster: replicas=1, adds jaeger + mailpit
    ├── staging/    # staging cluster: adds mailpit, prod image tags
    └── production/ # replicas=3, ExternalName for managed services, TLS Ingress
```

**Kustomize** is used for environment overlays (not Helm). Base manifests define the canonical shape; overlays only patch what differs per environment. No templating language to learn alongside K8s.

---

## Docker Compose → Kubernetes Mapping

| Concern              | Docker Compose (Phases 1–10)              | Kubernetes (Phase 11)                          |
| -------------------- | ----------------------------------------- | ---------------------------------------------- |
| Service discovery    | Container name DNS (`rabbitmq:5672`)      | CoreDNS Service name (`rabbitmq:5672` — same!) |
| Health checks        | `healthcheck:` block                      | Liveness + Readiness probes                    |
| Zero-downtime deploy | `blue-green-deploy.sh` (130 lines)        | Rolling update (built-in, 5 lines of config)   |
| Scaling              | Manual: SSH + edit compose                | HPA: automatic CPU/memory-based                |
| Secrets              | `.env` file on server                     | K8s Secret (base64 encoded)                    |
| Non-secret config    | YAML anchors in compose file              | ConfigMap                                      |
| Traffic routing      | nginx container + `upstream.conf`         | Ingress controller                             |
| Stateful workloads   | Named volumes                             | StatefulSet + PVC                              |
| One-shot tasks       | `docker run --rm`                         | K8s Job                                        |
| Dependency ordering  | `depends_on: condition: service_healthy`  | Init containers                                |
| Rollback             | `IMAGE_TAG=old bash blue-green-deploy.sh` | `kubectl rollout undo deployment/backend`      |
| Infra-as-code        | `docker-compose.prod.yml`                 | YAML manifests + Kustomize overlays            |

---

## Key Concepts

### 1. Rolling Updates Replace Blue-Green Script

`apps/backend/scripts/blue-green-deploy.sh` was 130 lines doing 5 things manually:

1. Start new slot → K8s starts new Pods automatically
2. Poll health check → readiness probe gates traffic (with `maxUnavailable: 0`)
3. Switch nginx upstream → Deployment controller removes old Pods from Service endpoints
4. Sleep 30s for drain → `preStop: sleep 5` + `terminationGracePeriodSeconds: 30`
5. Stop old slot → K8s terminates Pods after drain

Every step was a manual re-implementation of what K8s does natively.

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxUnavailable: 0 # never fewer than minReplicas healthy Pods
    maxSurge: 1 # allow 1 extra Pod during rollout
```

Rollback: `kubectl rollout undo deployment/backend -n ecommerce`

### 2. Liveness vs Readiness Probes

The backend already separates `/api/health/live` from `/api/health/ready` — this was designed for exactly this moment:

- **Liveness** (`/api/health/live`): process-local check (memory, disk). Failure → restart container.
- **Readiness** (`/api/health/ready`): dependency check (DB + Redis). Failure → remove from Service endpoints (no traffic), but don't restart.

Other services (auth, search, gateway, notification) currently only have `GET /health → { status: 'ok' }`. They use this for both probes. A future improvement: add proper readiness endpoints that check their specific dependencies.

### 3. Resources: Requests vs Limits

Resource values come directly from `apps/backend/docker-compose.prod.yml`:

- `cpus: '1'` → `limits.cpu: 1000m` (millicores)
- `memory: 512M` → `limits.memory: 512Mi`
- requests set at ~50% of limits (Burstable QoS class)

```yaml
resources:
  requests:
    cpu: "500m" # scheduler guarantee on a Node
    memory: "256Mi"
  limits:
    cpu: "1000m" # cgroup ceiling — OOMKilled if exceeded
    memory: "512Mi"
```

### 4. ConfigMaps vs Secrets

Non-sensitive config (service URLs, NODE_ENV, OTEL endpoint) → `app-config` ConfigMap.  
Sensitive values (DB URLs, JWT keys, passwords) → named Secrets per service.

```yaml
# K8s Secrets are base64-encoded, NOT encrypted at rest by default.
# "Secret" is a resource classification, not a security guarantee.
# Production uses Sealed Secrets (encrypted, safe to commit to git).
```

See `k8s/overlays/local/secrets/README.md` for the full list of required Secrets.

### 5. StatefulSets for Infra

Postgres, Redis, and RabbitMQ use StatefulSets (not Deployments):

- Pods get stable names: `postgres-0`, `redis-0`
- Each Pod gets its own PVC via `volumeClaimTemplates`
- Sequential startup ordering
- Data directory follows the Pod across reschedules

**Production note**: In real production, replace with managed services. The Kustomize production overlay (`external-services.yaml`) patches these into ExternalName Services pointing to AWS RDS / ElastiCache / CloudAMQP. App code connects to the same DNS name in all environments.

### 6. Prisma Migration as a K8s Job

```yaml
# A Job runs once to completion — not an always-running server.
apiVersion: batch/v1
kind: Job
spec:
  backoffLimit: 3
  template:
    spec:
      restartPolicy: OnFailure
      containers:
        - name: migrate
          command: ["npx", "prisma", "migrate", "deploy"]
          env:
            - name: DIRECT_DATABASE_URL # bypasses PgBouncer — advisory locks require direct connection
              valueFrom:
                secretKeyRef: ...
```

Why not an initContainer: with 3 replicas starting simultaneously, 3 migration processes would race. A Job runs once, CI waits for it to complete, then the Deployment rollout starts.

### 7. HPA — Horizontal Pod Autoscaler

```bash
kubectl get hpa -n ecommerce
# NAME          REFERENCE           TARGETS   MINPODS   MAXPODS   REPLICAS
# backend-hpa   Deployment/backend  42%/70%   2         10        2
```

`behavior.scaleDown.stabilizationWindowSeconds: 300` — waits 5 minutes before scaling down after a traffic spike. Prevents flapping.

Requires Metrics Server. For I/O-bound workloads (most of this backend), HTTP request rate from Prometheus is a better scaling signal than CPU — needs the Prometheus Adapter (Phase 12/13 item).

### 8. Kustomize Overlays

```bash
# See the final merged YAML for local:
kustomize build k8s/overlays/local

# Check replicas per overlay:
kustomize build k8s/overlays/local | grep replicas      # 1
kustomize build k8s/overlays/production | grep replicas # 3
```

CI sets image tags with:

```bash
kustomize edit set image ghcr.io/.../backend=ghcr.io/.../backend:sha-abc1234
kubectl apply -k k8s/overlays/staging
```

### 9. Init Containers

K8s starts all Pods across all Deployments simultaneously — no built-in dependency ordering. Init containers run to completion before the main container starts:

```yaml
initContainers:
  - name: wait-for-pgbouncer
    image: busybox:1.36
    command: ["sh", "-c", "until nc -z pgbouncer 6432; do sleep 2; done"]
```

Without init containers: Pods crash-loop until dependencies are ready (K8s retries on failure, so it eventually works, but logs are messy). Init containers make it intentional and explicit.

### 10. CI/CD: kubectl apply Replaces SSH

Old flow:

```
CI → SSH into server → docker compose pull → blue-green-deploy.sh
```

New flow:

```
CI → configure kubeconfig → run migrate Job → kustomize edit set image → kubectl apply -k
```

CI no longer has SSH access to production servers — it has a scoped kubeconfig token with `edit` permissions in the `ecommerce` namespace only.

New GitHub secrets required:

- `KUBECONFIG_STAGING` — base64-encoded kubeconfig for staging cluster service account
- `KUBECONFIG_PRODUCTION` — base64-encoded kubeconfig for production cluster service account

Generate a scoped service account:

```bash
kubectl create serviceaccount ci-deployer -n ecommerce
kubectl create rolebinding ci-deployer \
  --clusterrole=edit \
  --serviceaccount=ecommerce:ci-deployer \
  -n ecommerce
kubectl create token ci-deployer -n ecommerce --duration=8760h | base64 -w0
# Paste the output as KUBECONFIG_STAGING / KUBECONFIG_PRODUCTION in GitHub Secrets
```

---

## Running Phase 11 Locally

```bash
# 1. Create kind cluster
bash k8s/scripts/local-setup.sh

# 2. Create dev secrets
bash k8s/scripts/create-dev-secrets.sh

# 3. Apply all manifests
kubectl apply -k k8s/overlays/local

# 4. Watch pods start
kubectl get pods -n ecommerce -w

# 5. Add to /etc/hosts
echo "127.0.0.1 api.ecommerce.local" | sudo tee -a /etc/hosts

# 6. Test the full stack through the gateway
curl http://api.ecommerce.local/health

# 7. Port-forward observability UIs
kubectl port-forward svc/grafana 3001:3000 -n ecommerce    # http://localhost:3001
kubectl port-forward svc/jaeger 16686:16686 -n ecommerce   # http://localhost:16686
```

### Simulate a rolling deploy

```bash
# Build new image tag
docker build -t ghcr.io/your-org/ecommerce-monorepo/backend:sha-new \
  -f apps/backend/Dockerfile --target runner .

# Update image + roll out
kubectl set image deployment/backend \
  backend=ghcr.io/your-org/ecommerce-monorepo/backend:sha-new \
  -n ecommerce

# Watch the rolling update — new Pod starts, passes readiness, old Pod stops
kubectl rollout status deployment/backend -n ecommerce

# Rollback if needed
kubectl rollout undo deployment/backend -n ecommerce
```

---

## Key Files

- `k8s/base/namespace.yaml`
- `k8s/base/infra/` — StatefulSets for postgres, redis, rabbitmq, opensearch; pgbouncer Deployment
- `k8s/base/backend/deployment.yaml` — liveness/readiness probes, resource limits, init containers
- `k8s/base/backend/hpa.yaml` — HPA with scaleDown stabilization window
- `k8s/base/gateway/deployment.yaml` — public entry point
- `k8s/base/ingress/ingress.yaml` — NGINX Ingress (replaces nginx container)
- `k8s/base/monitoring/` — prometheus + grafana with configMapGenerator
- `k8s/base/jobs/migrate-job.yaml` — Prisma migration Job template
- `k8s/overlays/local/` — kind: scale-down patch, adds jaeger + mailpit
- `k8s/overlays/production/patches/external-services.yaml` — ExternalName for managed services
- `k8s/scripts/local-setup.sh` — kind cluster + ingress-nginx setup
- `k8s/scripts/create-dev-secrets.sh` — all dev secrets in one script
- `.github/workflows/ci.yml` — deploy jobs updated from SSH to kubectl apply

---
