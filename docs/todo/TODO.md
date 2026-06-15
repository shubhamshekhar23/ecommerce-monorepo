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

**6. Event streaming — CDC + Debezium** (`event-streaming.md`)
Kafka + Debezium for search sync. Required before analytics (both depend on Kafka topics being available).

**7. Event streaming — Analytics & Recommendations** (`event-streaming.md`)
Clickstream pipeline and recommendation engine. Requires Kafka from step 6.

**8. Kubernetes — Network Policies + PDBs** (`kubernetes-platform.md`)
Zero-trust pod networking and disruption budgets. Must be in place before autoscaling — PDBs protect pods during Cluster Autoscaler scale-down.

**9. Kubernetes — Service Mesh** (`kubernetes-platform.md`)
Istio/Linkerd for mTLS and traffic observability. Complements Network Policies with identity-based enforcement.

**10. Kubernetes — KEDA** (`kubernetes-platform.md`)
Scale workers on queue depth. Requires PDBs from step 8.

**11. Kubernetes — Cluster Autoscaler** (`kubernetes-platform.md`)
Node-level scaling. Requires PDBs (step 8) and KEDA (step 10) to be in place so scale-down is safe and pods actually reduce when queues drain.

**12. Multi-Region** (`kubernetes-platform.md`)
Active-active across regions. Everything else must be stable first.
