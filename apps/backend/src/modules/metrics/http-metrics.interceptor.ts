import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Histogram } from 'prom-client';
import type { Request, Response } from 'express';

// Intercepts every HTTP request and records duration into a Prometheus histogram.
// Uses req.route.path (the NestJS route pattern) instead of req.url so that
// /api/products/123 and /api/products/456 both map to /api/products/:id —
// one time series per route, not one per entity ID (avoids cardinality explosion).
@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(
    @InjectMetric('http_request_duration_ms')
    private readonly histogram: Histogram<string>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const startMs = Date.now();

    return next.handle().pipe(
      tap({
        next: () => this.record(req, res.statusCode, startMs),
        error: (err: { status?: number }) => this.record(req, err.status ?? 500, startMs),
      }),
    );
  }

  private record(req: Request, statusCode: number, startMs: number): void {
    const route = (req.route?.path as string | undefined) ?? req.path;
    if (route === '/api/metrics') return;
    this.histogram.labels(req.method, route, String(statusCode)).observe(Date.now() - startMs);
  }
}
