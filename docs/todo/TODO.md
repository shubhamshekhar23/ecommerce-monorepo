# TODO Index

Deferred work grouped by theme. Each file contains the full context, current state, and implementation plan for its items.

---

## Files

- [observability.md](observability.md) — Log–trace correlation and future observability work
- [ci-cd-gitops.md](ci-cd-gitops.md) — Matrix CI for all services + GitOps with Argo CD + Dockerfile cleanup
- [event-streaming.md](event-streaming.md) — CDC + Debezium, Analytics & Recommendations
- [kubernetes-platform.md](kubernetes-platform.md) — Network Policies, PDBs, Service Mesh, KEDA, Cluster Autoscaler, Multi-Region

---

## Sequential Implementation Order

Work these in order — each group unblocks the next.

**1. ~~Phase 7 backfill~~ ✅ Done (2026-06-15)**
Reviews, Returns, Stock Alerts, Tax, and Vendor Marketplace gaps all closed. See `docs/phases/phase-7-features.md` for details.

**2. ~~Observability~~ ✅ Done (2026-06-15)** (`observability.md`)
Log–trace correlation already implemented: `mixin: getOtelContext` in `LoggerModule` injects `trace_id`, `span_id`, `trace_flags` into every Pino log line.

**3. ~~CI/CD — Dockerfile cleanup~~ ✅ Done (2026-06-15)** (`ci-cd-gitops.md`)
All four service Dockerfiles rewritten to the 3-stage deps→builder→runner pattern.

**4. ~~CI/CD — Matrix workflow~~ ✅ Done (2026-06-15)** (`ci-cd-gitops.md`)
ci.yml now uses dorny/paths-filter + matrix build over changed services. Broken deploy jobs disabled.

**5. ~~CI/CD — GitOps with Argo CD~~ ✅ Done (partial, 2026-06-15)** (`ci-cd-gitops.md`)
Argo CD Application manifests committed to k8s/argocd/. App-of-apps pattern ready to apply once a cluster exists. Deploy jobs remain disabled until then.

**6. ~~Event streaming — CDC + Debezium~~ ✅ Done (2026-06-15)** (`event-streaming.md`)
Redpanda + Kafka Connect + Debezium 2.7 wired into docker-compose. Postgres WAL set to logical. `search-service` CDC consumer replaces RabbitMQ consumer. Debezium connector config at `infra/debezium/connector.json`.

**7. ~~Event streaming — Analytics & Recommendations~~ ✅ Done (2026-06-15)** (`event-streaming.md`)
`apps/analytics-service`: ClickHouse (columnar store) + kafkajs `order.placed` consumer + 5-min co-purchase cron → Redis sorted sets → `GET /api/recommendations/products/:id`. Backend publishes via `KafkaProducerService` + `OrderAnalyticsHandler`.

**8. ~~Kubernetes — Network Policies + PDBs~~ ✅ Done (2026-06-15)** (`kubernetes-platform.md`)
Default-deny ingress NetworkPolicy + 11 per-service allow policies in `k8s/base/network-policies/`. PDBs (`minAvailable: 1`) for backend, gateway, auth-service, postgres, redis, rabbitmq in `k8s/base/pdb/`. analytics-service k8s manifests added.

**9. ~~Kubernetes — Service Mesh~~ ✅ Done (2026-06-15)** (`kubernetes-platform.md`)
Istio manifests in `k8s/base/service-mesh/`: STRICT mTLS PeerAuthentication, DestinationRules (circuit breaking + connection pool limits), VirtualServices (per-service timeouts and retries). Namespace labeled for automatic sidecar injection.

**10. ~~Kubernetes — KEDA~~ ✅ Done (2026-06-15)** (`kubernetes-platform.md`)
ScaledObject for notification-service in `k8s/base/keda/`: scales on `notification.order` queue depth (1 replica per 10 messages), min 1, max 20, 15s poll, 60s cooldown. TriggerAuthentication reads RabbitMQ Management API credentials from a Secret.

**11. ~~Kubernetes — Cluster Autoscaler~~ ✅ Done (2026-06-15)** (`kubernetes-platform.md`)
Manifests in `k8s/cluster-autoscaler/` (kube-system namespace, applied separately). RBAC + Deployment with `--balance-similar-node-groups`, `--expander=least-waste`, `--scale-down-unneeded-time=10m`, nodes=2:10. `safe-to-evict: "true"` on notification-service, analytics-service, search-service pod templates.

**12. Multi-Region** (`kubernetes-platform.md`)
Active-active across regions. Everything else must be stable first.
