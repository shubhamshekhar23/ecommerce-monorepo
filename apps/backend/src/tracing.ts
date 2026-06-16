import * as Sentry from '@sentry/node';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import type { SpanExporter } from '@opentelemetry/sdk-trace-base';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

/*
 - This file MUST be imported before any other module so that
 - auto-instrumentation patches wrap Node modules at require() time.
 - If you import NestJS first, HTTP/Redis spans will not be captured.
 -
 - Prisma query spans are NOT handled here. @prisma/instrumentation is
 - incompatible with @opentelemetry/sdk-node >= 0.218.0 because it uses
 - internal Span constructor APIs that changed in sdk-trace-base v2.x.
 - Instead, PrismaService registers a $use middleware that creates spans
 - using the public OTEL API — see src/modules/prisma/prisma.service.ts.
 */

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.APP_VERSION,
  tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.1'),
  profilesSampleRate: 0.05,
});

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: 'ecommerce-backend',
    [ATTR_SERVICE_VERSION]: process.env.npm_package_version ?? '1.0.0',
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318/v1/traces',
  }) as unknown as SpanExporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
      /*
       - Disabled because logger.module.ts injects trace_id/span_id via a
       - pino mixin that reads api.trace.getActiveSpan() at log time.
       - That approach is more reliable than the patch-based instrumentation
       - which can read stale context when res.on('finish') fires after the
       - HTTP span has already exited its AsyncLocalStorage scope.
       */
      '@opentelemetry/instrumentation-pino': { enabled: false },
    }),
  ],
});

sdk.start();

process.on('SIGTERM', () => {
  sdk.shutdown().catch(() => {});
});
