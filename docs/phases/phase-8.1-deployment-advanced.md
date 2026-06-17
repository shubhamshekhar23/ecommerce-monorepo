# Phase 8.1 — Deployment Advanced

**Status:** 🔲 Pending
**Builds on:** [Phase 8 — CI/CD & Production](./phase-8-cicd.md), [Phase 11 — Kubernetes Platform](./phase-11-kubernetes.md)
**Concept cluster:** Two operational maturity patterns that build on the already-deployed Istio and Argo CD infrastructure — Canary Deployment for metric-driven progressive rollout, and Leader Election for safe singleton job coordination across replicas.

---

## Canary Deployment (Istio + Argo Rollouts)

**What:** Route a small percentage of live traffic to the new version, observe real error rates and latency from Prometheus, then automatically promote or roll back — without human intervention.

**Why Blue-Green is not enough:** Blue-Green (already done in Phase 8) gives you a fast switch and a fast rollback, but you switch 100% of traffic at once. If the new version has a subtle bug that only appears under real load or with specific request patterns, you discover it after the entire user base is affected. Canary limits blast radius to the canary slice — typically 10% — so 90% of users are unaffected while the new version proves itself.

**Prerequisites already in place:**
- Istio service mesh deployed (Phase 11) — provides the traffic splitting primitive
- Argo CD deployed (Phase 11) — manages GitOps reconciliation
- Prometheus deployed (Phase 5) — provides the metrics for the `CanaryAnalysis`

**Approach:**

Replace the backend `Deployment` with an Argo `Rollout`:

```yaml
# k8s/base/rollouts/backend-rollout.yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: backend
spec:
  replicas: 3
  strategy:
    canary:
      canaryService: backend-canary
      stableService: backend-stable
      trafficRouting:
        istio:
          virtualService:
            name: backend-vs
            routes: [primary]
      steps:
        - setWeight: 10        # 10% canary, 90% stable
        - pause: { duration: 5m }
        - setWeight: 30
        - pause: { duration: 5m }
        - setWeight: 60
        - pause: { duration: 5m }
        # Full promotion happens automatically if analysis passes
      analysis:
        templates:
          - templateName: backend-success-rate
        startingStep: 1
```

`CanaryAnalysis` template reading from Prometheus:

```yaml
# k8s/base/rollouts/canary-analysis.yaml
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: backend-success-rate
spec:
  metrics:
    - name: success-rate
      interval: 1m
      successCondition: result[0] >= 0.99   # 99% success rate
      failureLimit: 3
      provider:
        prometheus:
          address: http://prometheus:9090
          query: |
            sum(rate(http_requests_total{app="backend",status!~"5.."}[2m]))
            /
            sum(rate(http_requests_total{app="backend"}[2m]))

    - name: p99-latency
      interval: 1m
      successCondition: result[0] <= 500    # p99 under 500ms
      failureLimit: 3
      provider:
        prometheus:
          address: http://prometheus:9090
          query: |
            histogram_quantile(0.99,
              sum(rate(http_request_duration_seconds_bucket{app="backend"}[2m])) by (le)
            ) * 1000
```

Two `Service` objects — `backend-stable` and `backend-canary` — both selecting the same pod label but Istio's `VirtualService` routes traffic between them by weight.

**Automatic rollback:** If the `AnalysisTemplate` hits `failureLimit`, Argo Rollouts automatically sets weight back to 0%, drains canary pods, and marks the rollout as `Degraded`. No human intervention required.

**Key files:**
- `k8s/base/rollouts/backend-rollout.yaml` — replaces `k8s/base/backend/deployment.yaml`
- `k8s/base/rollouts/canary-analysis.yaml` — AnalysisTemplate
- `k8s/base/rollouts/backend-services.yaml` — `backend-stable` + `backend-canary` Services
- `k8s/base/service-mesh/backend-vs.yaml` — update VirtualService to reference both subsets
- `k8s/base/kustomization.yaml` — add rollouts resources
- Argo CD ApplicationSet — ensure it reconciles the new Rollout resource (may need `argoproj.io/v1alpha1` CRD installed on cluster)

---

## Leader Election

**What:** Guarantee that exactly one replica executes a scheduled job at any given time, even when multiple backend pods are running.

**Why it matters:** The project already runs cron jobs — outbox relay, payment retry cleanup, inbox message purge, data erasure processor. In a single-pod setup these work fine. In Kubernetes with `replicas: 3`, all three pods execute the same `@Cron()` simultaneously. The outbox relay publishes each event three times. The data erasure job anonymises the same user three times. The V2 Distributed Lock (`withLock`) solves this for short-lived tasks. Leader Election extends the same mechanism for long-lived, recurring coordination — only the current leader runs the tick; the others stand by and take over if the leader crashes.

**Leader Election vs Distributed Lock:**

- Distributed Lock (V2 item 10): short-lived exclusive access to a single operation. Lock acquired, work done, lock released. Duration: milliseconds to seconds.
- Leader Election: one node holds a long-lived lease and is the designated executor for all recurring work until it crashes or the lease expires. Duration: minutes to indefinite.

Both use Redis SETNX under the hood; the difference is lease TTL and renewal behaviour.

**Approach:**

Extend `DistributedLockService` with a `LeaderElectionService`:

```typescript
@Injectable()
export class LeaderElectionService implements OnModuleInit, OnModuleDestroy {
  private readonly leaseKey   = 'leader:backend';
  private readonly leaseTtlMs = 30_000;   // 30s lease
  private readonly renewEvery = 10_000;   // renew every 10s
  private renewInterval: NodeJS.Timeout;
  private isLeader = false;

  async onModuleInit(): Promise<void> {
    await this.tryAcquire();
    this.renewInterval = setInterval(() => this.tryAcquire(), this.renewEvery);
  }

  async onModuleDestroy(): Promise<void> {
    clearInterval(this.renewInterval);
    if (this.isLeader) await this.release();
  }

  private async tryAcquire(): Promise<void> {
    const instanceId = process.env.POD_NAME ?? os.hostname();
    /*
     - SET key value NX PX ttl: set only if not exists, with TTL in ms.
     - If key exists and value is our instanceId, extend the TTL (renewal).
     - Lua script for atomic check-or-set:
     */
    const acquired = await this.redis.eval(
      `local v = redis.call('GET', KEYS[1])
       if v == false then
         return redis.call('SET', KEYS[1], ARGV[1], 'PX', ARGV[2])
       elseif v == ARGV[1] then
         return redis.call('PEXPIRE', KEYS[1], ARGV[2])
       else
         return 0
       end`,
      1, this.leaseKey, instanceId, String(this.leaseTtlMs),
    );
    this.isLeader = acquired !== 0;
  }

  private async release(): Promise<void> {
    // Same compare-and-delete as DistributedLockService — only release our own lease
    await this.redis.eval(
      `if redis.call('GET', KEYS[1]) == ARGV[1] then
         return redis.call('DEL', KEYS[1])
       else return 0 end`,
      1, this.leaseKey, process.env.POD_NAME ?? os.hostname(),
    );
  }

  get isCurrentLeader(): boolean {
    return this.isLeader;
  }
}
```

Guard cron jobs with a leader check:

```typescript
@Cron(CronExpression.EVERY_30_SECONDS)
async processOutbox(): Promise<void> {
  if (!this.leaderElection.isCurrentLeader) return;
  // Only the leader executes this
  await this.outboxService.processOutbox();
}
```

`POD_NAME` is injected via Kubernetes `fieldRef: fieldPath: metadata.name` in the Deployment env block — each pod has a unique, stable identity.

**Crash recovery:** If the leader pod crashes without calling `release()`, the lease expires in 30 seconds (leaseTtlMs). The next renewal tick on another pod acquires the lease and becomes the new leader. Maximum gap: one lease TTL.

**Key files:**
- `apps/backend/src/modules/common/leader-election.service.ts` — new service
- `apps/backend/src/modules/common/common.module.ts` — register as singleton
- `apps/backend/src/modules/tasks/outbox.processor.ts` — guard with `isCurrentLeader`
- `apps/backend/src/modules/tasks/inbox-cleanup.processor.ts` — guard with `isCurrentLeader`
- `apps/backend/src/modules/tasks/erasure.processor.ts` — guard with `isCurrentLeader`
- `k8s/base/backend/deployment.yaml` — add `POD_NAME` env from `metadata.name` fieldRef
