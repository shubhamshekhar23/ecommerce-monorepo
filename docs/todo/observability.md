# Observability

Gaps in logging, tracing, and monitoring correlation. Builds on the existing OpenTelemetry + Pino + Prometheus setup already in place.

---

## Log–Trace Correlation ✅ Done (2026-06-15)

### Inject Trace ID Into Every Log Line

**What:** Stamp every Pino log entry with the active OpenTelemetry `traceId` and `spanId` so logs and traces are joinable in Grafana/Tempo.

**Status:** Already implemented. `logger.module.ts` registers a `mixin: getOtelContext` function that reads `api.trace.getActiveSpan()` at log time and injects `trace_id`, `span_id`, and `trace_flags` into every log record. `@opentelemetry/instrumentation-pino` is intentionally disabled in `tracing.ts` because the mixin approach is more reliable (avoids the race where `res.on('finish')` fires after the HTTP span has exited its ALS scope).

Verified live: every request log line carries all three fields, e.g.:
```json
{ "trace_id": "f517ce51615bec8b6c82a3f12038305b", "span_id": "0c53dfb8d1f03571", "trace_flags": "01" }
```

**Grafana query to join logs and traces:** In Grafana Explore, use a Loki derived field on `trace_id` pointing at the Tempo datasource. Then clicking `trace_id` in any log line opens the linked Tempo trace directly.

**References:** `apps/backend/src/modules/logger/logger.module.ts`, `apps/backend/src/tracing.ts`

---

## Future Observability Work (Phase 10+)

Items below are not yet in scope but belong in this file as they extend the same observability stack.

- Structured error budget dashboards (SLO burn rate alerts in Grafana)
- Distributed tracing across microservices once auth-service and notification-service share the same OTEL collector
- Business-level dashboards: revenue per hour, conversion funnel drop-off, active cart count — derived from the existing `BusinessMetricsService` Prometheus counters
