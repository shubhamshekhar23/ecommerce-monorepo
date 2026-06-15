# TODO Index

Deferred work grouped by theme. Each file contains the full context, current state, and implementation plan for its items.

---

## Files

- [phase-7-backfill.md](phase-7-backfill.md) — Application feature gaps: Reviews, Tax, Stock Alerts, Returns, Vendor Marketplace
- [observability.md](observability.md) — Log–trace correlation and future observability work
- [ci-cd-gitops.md](ci-cd-gitops.md) — Matrix CI for all services + GitOps with Argo CD + Dockerfile cleanup
- [event-streaming.md](event-streaming.md) — CDC + Debezium, Analytics & Recommendations
- [kubernetes-platform.md](kubernetes-platform.md) — Network Policies, PDBs, Service Mesh, KEDA, Cluster Autoscaler, Multi-Region

---

## Sequential Implementation Order

Work these in order — each group unblocks the next.

**1. Phase 7 backfill** (`phase-7-backfill.md`)
No infrastructure dependencies. Pure application code. Do these first to close completeness gaps in existing features before adding new systems.

**2. Observability** (`observability.md`)
Add trace ID injection to logs. Low effort, high payoff — cross-linking traces and logs makes every debugging session faster. No deployment changes needed.

**3. CI/CD — Dockerfile cleanup** (`ci-cd-gitops.md`)
Rewrite the four service Dockerfiles to match the backend's 3-stage pattern. Current workaround is fragile — any lockfile change can break module resolution silently. Fix this before wiring CI so images build reliably.

**4. CI/CD — Matrix workflow** (`ci-cd-gitops.md`)
Wire CI for all services (currently only backend is built/pushed). Do this before Argo CD so you have images to deploy.

**5. CI/CD — GitOps with Argo CD** (`ci-cd-gitops.md`)
Replace broken kubectl-in-CI deploy jobs with Argo CD reconciliation. Unblocks reliable deployments for everything that follows.

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
