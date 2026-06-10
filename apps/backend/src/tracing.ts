import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

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

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [SEMRESATTRS_SERVICE_NAME]: 'ecommerce-backend',
    [SEMRESATTRS_SERVICE_VERSION]: process.env.npm_package_version ?? '1.0.0',
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318/v1/traces',
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ],
});

sdk.start();

process.on('SIGTERM', () => {
  sdk.shutdown().catch(() => {});
});
