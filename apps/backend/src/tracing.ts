import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

// This file MUST be imported before any other module so that
// auto-instrumentation patches wrap Node modules at require() time.
// If you import NestJS first, HTTP/Prisma/Redis spans will not be captured.
//
// How it works:
//   NodeSDK wraps Node's http, express, ioredis, and @prisma/client at startup.
//   Every inbound request becomes a root "span". Every outgoing DB query, Redis
//   command, or HTTP call becomes a child span. Spans are exported to Jaeger via
//   OTLP/HTTP and visualized as a waterfall — this is how you find slow code.
const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [SEMRESATTRS_SERVICE_NAME]: 'ecommerce-backend',
    [SEMRESATTRS_SERVICE_VERSION]: process.env.npm_package_version ?? '1.0.0',
  }),
  traceExporter: new OTLPTraceExporter({
    // OTEL_EXPORTER_OTLP_ENDPOINT env var overrides this at runtime.
    // Default points to local Jaeger in docker-compose.
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318/v1/traces',
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      // fs instrumentation creates a flood of spans — disable it
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ],
});

sdk.start();

process.on('SIGTERM', () => {
  sdk.shutdown().catch(() => {});
});
