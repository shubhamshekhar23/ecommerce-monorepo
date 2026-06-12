# Deferred Polish — Todo

Things that are intentionally skipped for now but worth coming back to. Each item notes which phase it belongs to and why it was deferred.

---

## Phase 5 — Observability

### Full Log-Trace Correlation (Pino → OpenTelemetry Log Bridge)

**What:** Inject `trace_id` and `span_id` into every Pino log line so that clicking a span in Grafana's Jaeger panel queries Loki for the exact logs of that specific request — not just all logs in that time window.

**Current state:** `tracesToLogsV2` is configured in `grafana/provisioning/datasources/jaeger.yml` with `filterByTraceID: true`. Grafana attempts to filter Loki by trace ID, but since Pino does not emit `trace_id`, it falls back to a ±1 minute time-window query. This works fine under low traffic but becomes noisy when many concurrent requests overlap in the same window.

**How to implement:**
- Use OpenTelemetry's Log Bridge API (`@opentelemetry/api-logs` + `@opentelemetry/sdk-logs`)
- Hook into Pino's transport layer to read the active OTel span context and append `trace_id` and `span_id` to each log record
- Ensure the OTel context propagates correctly across async boundaries (already handled by `AsyncLocalStorage` via the OTel SDK)
- Once log lines contain `trace_id`, the Grafana `filterByTraceID` filter becomes exact — three pillars fully cross-linked

**Why deferred:** Time-window fallback is sufficient for learning and local load testing. The real pain is only felt under high concurrent traffic where logs from multiple requests overlap. Revisit in Phase 10/11 when doing serious performance work.

**References:** `apps/backend/src/tracing.ts`, `docs/features/phase-5-observability.md`

---
