import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import * as api from '@opentelemetry/api';

const serializers = {
  req(request: any) {
    return {
      method: request.method,
      url: request.url,
      remoteAddress: request.socket?.remoteAddress,
    };
  },
  res(response: any) {
    return {
      statusCode: response.statusCode,
    };
  },
};

/*
 - Reads the active OTEL span context at the moment each log line is written.
 - This runs as a pino mixin so it captures the correct span_id even when
 - pino-http's res.on('finish') callback fires after the HTTP instrumentation
 - has exited its context scope — a race that makes instrumentation-pino
 - inject the wrong (or no) span_id.
 */
function getOtelContext(): Record<string, string> {
  const span = api.trace.getActiveSpan();
  if (!span) return {};
  const ctx = span.spanContext();
  if (!api.isSpanContextValid(ctx)) return {};
  return {
    trace_id: ctx.traceId,
    span_id: ctx.spanId,
    trace_flags: `0${ctx.traceFlags.toString(16)}`,
  };
}

function createPinoConfig(configService: ConfigService) {
  return {
    pinoHttp: {
      level: configService.get<string>('LOG_LEVEL') || 'info',
      genReqId: (req: any) => req.headers['x-request-id'] || uuidv4(),
      customProps: (req: any) => ({ requestId: req.id }),
      mixin: getOtelContext,
      serializers,
    },
  };
}

@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: createPinoConfig,
    }),
  ],
})
export class LoggerModule {}
