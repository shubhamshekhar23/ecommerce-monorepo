import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { PrismaService } from '@/modules/prisma/prisma.service';

// RequestMetricsMiddleware writes HTTP request timing data to the RequestMetric
// partitioned table. This feeds the partition pruning demo and lets you query
// real production-shaped data with time-range filters.
//
// Sampling: only 10% of requests are recorded. Without sampling, every API call
// would write a row, which is too noisy for high-traffic services. In production
// you would also exclude health check and metrics endpoints.
//
// Fire-and-forget: the DB write uses void (no await). The response is sent
// to the client before the DB write completes. Adding latency to every request
// to record telemetry would be a mistake — this data is not critical.
//
// Why a middleware and not an interceptor?
//   NestJS interceptors run after guards and pipes, so they miss 401/403 responses.
//   A middleware runs before the entire NestJS lifecycle and captures all status codes.
@Injectable()
export class RequestMetricsMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestMetricsMiddleware.name);
  private static readonly SAMPLE_RATE = 0.1;

  private static readonly SKIP_PATHS = ['/health', '/api/v1/metrics', '/api/v1/docs'];

  constructor(private readonly prisma: PrismaService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    if (!this.shouldSample(req.path)) {
      next();
      return;
    }

    const startedAt = Date.now();

    res.on('finish', () => {
      const durationMs = Date.now() - startedAt;
      const userId = (req as Request & { user?: { sub?: string } }).user?.sub ?? null;

      this.prisma.requestMetric
        .create({
          data: {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            durationMs,
            userId,
          },
        })
        .catch((err: Error) => this.logger.error('RequestMetric write failed', err.message));
    });

    next();
  }

  private shouldSample(path: string): boolean {
    if (RequestMetricsMiddleware.SKIP_PATHS.some((p) => path.startsWith(p))) {
      return false;
    }
    return Math.random() < RequestMetricsMiddleware.SAMPLE_RATE;
  }
}
