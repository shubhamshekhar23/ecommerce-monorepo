# Observability

Gaps in logging, tracing, and monitoring correlation. Builds on the existing OpenTelemetry + Pino + Prometheus setup already in place.

---

## Log–Trace Correlation (Phase 5 Gap)

### Inject Trace ID Into Every Log Line

**What:** Stamp every Pino log entry with the active OpenTelemetry `traceId` and `spanId` so logs and traces are joinable in Grafana/Tempo.

**Current state:** Pino and OpenTelemetry are both set up, but the trace context is not injected into the Pino log format. Logs and traces exist in parallel but cannot be correlated by trace ID.

**Why it matters:** Without the correlation, you cannot go from a slow Tempo span → drill into logs → see exactly what happened. The two systems are blind to each other, which defeats the purpose of structured observability.

- Add a `mixin` to the Pino logger that reads `trace.getActiveSpan()` from the OpenTelemetry API and injects `traceId`, `spanId`, and `traceFlags` into every log record
- Ensure the mixin is added to the `PinoLogger` configuration in `LoggerModule`
- Confirm the fields appear in JSON log output during a traced request
- Document the Grafana query to join on `traceId`

**References:** `apps/backend/src/modules/logger/`, `apps/backend/src/tracing.ts`, NestJS Pino mixin docs

---

## Future Observability Work (Phase 10+)

Items below are not yet in scope but belong in this file as they extend the same observability stack.

- Structured error budget dashboards (SLO burn rate alerts in Grafana)
- Distributed tracing across microservices once auth-service and notification-service share the same OTEL collector
- Business-level dashboards: revenue per hour, conversion funnel drop-off, active cart count — derived from the existing `BusinessMetricsService` Prometheus counters
