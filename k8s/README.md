# Kubernetes — Phase 11

This directory contains all Kubernetes manifests for the ecommerce monorepo.

## Structure

```
k8s/
├── base/           # Canonical manifests — shared by all environments
│   ├── infra/      # postgres, pgbouncer, redis, rabbitmq, opensearch
│   ├── backend/    # backend Deployment + Service + HPA
│   ├── auth-service/
│   ├── gateway/    # public entry point (Ingress routes here)
│   ├── search-service/
│   ├── notification-service/
│   ├── ingress/    # NGINX Ingress (replaces nginx container from docker-compose)
│   ├── monitoring/ # prometheus + grafana
│   └── jobs/       # prisma-migrate Job template
└── overlays/
    ├── local/      # kind cluster: replicas=1, adds jaeger + mailpit
    ├── staging/    # staging cluster: adds mailpit, real image tags
    └── production/ # production: replicas=3, ExternalName for managed services, TLS
```

## Quick Start (Local)

```bash
# 1. Create kind cluster + ingress-nginx + metrics-server
bash k8s/scripts/local-setup.sh

# 2. Create all dev secrets
bash k8s/scripts/create-dev-secrets.sh

# 3. Build all service images and load them into the kind cluster
bash k8s/scripts/build-local.sh

# 4. Apply all manifests
# (--load-restrictor flag required: monitoring kustomization references grafana dashboards
#  and alert_rules.yml from apps/backend/, which is outside the k8s/ tree)
kustomize build --load-restrictor LoadRestrictionsNone k8s/overlays/local | kubectl apply -f -

# 5. Add to /etc/hosts
echo "127.0.0.1 api.ecommerce.local" | sudo tee -a /etc/hosts

# 6. Watch Pods come up
kubectl get pods -n ecommerce -w

# 7. Test
curl http://api.ecommerce.local/health
```

## Day-to-Day Commands

```bash
# View all Pods
kubectl get pods -n ecommerce

# Tail backend logs
kubectl logs -f deployment/backend -n ecommerce

# Port-forward to bypass ingress (useful for debugging)
kubectl port-forward svc/backend 4000:4000 -n ecommerce
kubectl port-forward svc/grafana 3001:3000 -n ecommerce
kubectl port-forward svc/jaeger 16686:16686 -n ecommerce
kubectl port-forward svc/rabbitmq 15672:15672 -n ecommerce

# Simulate a rolling deploy
kubectl set image deployment/backend backend=ghcr.io/.../backend:sha-new -n ecommerce
kubectl rollout status deployment/backend -n ecommerce

# Rollback
kubectl rollout undo deployment/backend -n ecommerce

# Run migrations manually
bash k8s/scripts/migrate.sh sha-abc1234

# Check HPA status
kubectl get hpa -n ecommerce

# Describe a crashing Pod
kubectl describe pod <pod-name> -n ecommerce
```

## Secrets

K8s Secrets are base64-encoded (NOT encrypted at rest by default).
- **Local/staging**: use `create-dev-secrets.sh`
- **Production**: use [Sealed Secrets](https://github.com/bitnami-labs/sealed-secrets) or [External Secrets Operator](https://external-secrets.io/)

See `k8s/overlays/local/secrets/README.md` for the full list of secrets required.

## CI/CD

The deploy jobs in `.github/workflows/ci.yml` use `kubectl apply -k` instead of SSH + blue-green-deploy.sh.

Rolling updates replace the blue-green script:
- New Pods start with the new image
- Readiness probe gates traffic (maxUnavailable: 0 — never fewer than min replicas healthy)
- Old Pods drain (preStop sleep 5 + terminationGracePeriodSeconds: 30)
- Old Pods stop

## Production: Managed Services

In production, the StatefulSets (postgres, redis, rabbitmq) are replaced by ExternalName Services that point to managed cloud endpoints (RDS, ElastiCache, CloudAMQP). See `k8s/overlays/production/patches/external-services.yaml`. App code connects to the same hostname (`postgres:5432`) in all environments.

## What This Phase Does NOT Include

- **Service Mesh** (Istio/Linkerd) — Phase 12
- **GitOps** (Argo CD / Argo Rollouts) — Phase 12
- **KEDA** event-driven autoscaling — Phase 13
- **Multi-region** — Phase 14
- **Network Policies** — Phase 12 security hardening
