# Kubernetes Platform Hardening

Production-readiness work for the Kubernetes layer. These items have no application-code dependencies — they are pure infrastructure and can be picked up in parallel with feature work.

---

## Network Policies — Zero-Trust Pod-to-Pod Traffic

**What:** Lock down pod-to-pod traffic with Kubernetes `NetworkPolicy` so services can only communicate with their declared dependencies.

**Current state:** All pods in the cluster can reach all other pods by default. A compromised `notification-service` pod could directly query the Postgres primary — there is no network-level enforcement of service boundaries.

**Why it matters:** The Kubernetes network default is fully open. `NetworkPolicy` is the only enforcement layer below the application. Without it, service isolation is policy-only, not enforced.

**Implementation plan:**

- Add a default-deny-all ingress policy to the `ecommerce` namespace
- Add explicit allow policies for each service's known dependencies:
  - `backend → postgres, redis, rabbitmq`
  - `auth-service → postgres (auth_db)`
  - `search-service → elasticsearch, kafka`
  - `notification-service → rabbitmq, smtp`
  - `gateway → backend, auth-service, search-service`
- Allow ingress to `gateway` only from the ingress controller namespace
- Apply to `k8s/network-policies/` with one file per service
- Require a CNI plugin that enforces policies (Calico, Cilium, or cloud-managed VPC-native)

**References:** `k8s/`, Kubernetes NetworkPolicy docs

---

## Pod Disruption Budgets — Safe Rolling Updates

**What:** Add `PodDisruptionBudget` resources to ensure minimum availability during node drain, cluster upgrades, and rolling deployments.

**Current state:** No PDBs are defined. When a node is drained (Cluster Autoscaler scale-down, manual maintenance), all pods on that node terminate simultaneously — a 2-replica deployment can go to 0.

**Why PDBs must precede Cluster Autoscaler:** The autoscaler drains nodes before terminating them. Without a PDB the autoscaler can drain a node that holds the only available replica of a service, causing a brief outage. PDBs block that drain until a replacement pod is ready.

**Implementation plan:**

- For each service with `replicas >= 2`, add a PDB with `minAvailable: 1` (or `maxUnavailable: 1`)
- For stateful services (Postgres, Redis, RabbitMQ) use `minAvailable: 1` to protect quorum
- Apply PDBs in `k8s/pdb/` before enabling Cluster Autoscaler
- Include PDB creation in the Argo CD app so they are always reconciled alongside deployments

**References:** `k8s/`, Kubernetes PodDisruptionBudget docs

---

## Service Mesh — mTLS And Observability

**What:** Deploy Istio or Linkerd to get mutual TLS between all services, traffic-level observability (latency per service pair, retries, circuit breaking) without application-layer changes.

**Current state:** Service-to-service calls are plain HTTP inside the cluster. The `opossum` circuit breaker in `apps/backend` is app-layer only. There is no mTLS enforcing service identity.

**Why a mesh vs application-level:** A mesh enforces mTLS at the sidecar proxy level — even a bug in application code cannot skip it. It also gives you Kiali/Grafana traffic graphs, per-route latency histograms, and automatic retry configuration that are not visible from Prometheus counters alone.

**Implementation plan:**

- Install Istio (or Linkerd for a lighter footprint) in the cluster
- Label the `ecommerce` namespace for automatic sidecar injection
- Define `DestinationRule` resources for circuit breaking per service (replaces opossum at infrastructure level)
- Define `VirtualService` resources for traffic shifting (useful for canary deployments in Phase 14)
- Enable Kiali and connect to Grafana for traffic topology graphs
- Enforce `PeerAuthentication` in STRICT mTLS mode — plain HTTP between pods becomes a policy violation

**References:** `k8s/`, Istio docs, Linkerd docs

---

## KEDA — Scale On Queue Depth Not CPU

**What:** Use KEDA to autoscale worker pods (notification, order processing) based on RabbitMQ queue depth instead of CPU utilisation.

**Current state:** HPA (HorizontalPodAutoscaler) is not configured. Pods run at fixed replica counts. During a sale event the RabbitMQ queue can build up while CPU stays low (the worker is I/O-bound waiting for email/SMS delivery) — CPU-based HPA would not scale.

**Why KEDA, not HPA on CPU:** Queue-based workers are almost always I/O-bound. CPU stays under 20% while thousands of messages pile up. KEDA scales on the metric that actually represents load: queue depth.

**Implementation plan:**

- Install KEDA in the cluster
- Add `ScaledObject` resources for `notification-service` and any order-processing workers
- Configure RabbitMQ scaler: `queueLength: 10` → add 1 replica per 10 pending messages
- Set `minReplicaCount: 1`, `maxReplicaCount: 20` to avoid cold-start and runaway scaling
- Set `pollingInterval: 15` (seconds between queue-depth checks)
- Keep PDBs active so KEDA scale-down doesn't violate minimum availability

**References:** `k8s/`, KEDA RabbitMQ scaler docs, `apps/notification-service/`

---

## Cluster Autoscaler — Node-Level Scaling

**What:** Add the Cluster Autoscaler so the node pool grows when pods are pending and shrinks when nodes are underutilised.

**Current state:** The cluster runs a fixed number of nodes. Pods that can't be scheduled due to resource exhaustion stay pending indefinitely — there is no mechanism to add nodes automatically.

**Why this comes last:** Cluster Autoscaler drains nodes before terminating them. Without PDBs (see above) that causes availability gaps. KEDA must also be in place so pod counts actually drop enough for the autoscaler to find underutilised nodes worth removing.

**Implementation plan:**

- Enable Cluster Autoscaler on the node pool (cloud-specific: `--balance-similar-node-groups`, `--skip-nodes-with-local-storage=false`)
- Set node pool min/max (`min: 2`, `max: 10` for the app pool)
- Annotate nodes with resource requests in all `Deployment` manifests — the autoscaler uses `requests`, not `limits`, to decide if a node is underutilised
- Add the `cluster-autoscaler.kubernetes.io/safe-to-evict: "true"` annotation to pods that can be freely moved (batch workers, non-stateful services)
- Verify scale-down: cordon a node, watch the autoscaler drain and terminate it while PDBs protect running pods

**References:** `k8s/`, Cluster Autoscaler cloud-provider docs

---

## Multi-Region Active-Active (Phase 14)

**What:** Run the platform across two regions (e.g. `us-east-1` and `eu-west-1`) with active traffic in both, using global load balancing and cross-region Postgres replication.

**Current state:** Single-region deployment with a single Postgres primary. A regional AWS/GCP outage takes down the entire platform.

**This is a Phase 14 item.** It requires all earlier items (PDBs, service mesh, KEDA, Cluster Autoscaler, GitOps) to be stable before cross-region complexity is introduced.

**High-level design:**

- Two Kubernetes clusters (one per region) managed by the same Argo CD instance (app-of-apps pointing at both)
- CockroachDB or PlanetScale (distributed SQL) replaces the single Postgres primary — multi-region writes with no cross-region synchronous round-trip for reads
- Alternatively: Postgres streaming replication with read replica in region 2, and only writes going cross-region to the primary (acceptable for most ecommerce write patterns)
- Global load balancer (CloudFlare, AWS Global Accelerator, or GCP Global LB) routes users to the nearest region
- Redis cross-region: separate cache per region (cache invalidation events over Kafka) — do not replicate session data cross-region synchronously
- RabbitMQ per region with shovel plugin for cross-region event fan-out where needed

**References:** `k8s/`, CockroachDB multi-region docs, AWS Global Accelerator, Argo CD multi-cluster docs
