import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CorrelationIdService } from '@/common/services/correlation-id.service';

// Pino (logger module) already reads x-request-id and generates a UUID if absent.
// This middleware wraps each request in AsyncLocalStorage so downstream code
// (services, workers, outgoing HTTP calls) can read the correlationId without
// it being threaded as a parameter. Also echoes the ID on the response header
// so the client can reference it in support requests.
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  constructor(private readonly correlationIdService: CorrelationIdService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const correlationId =
      (req.headers['x-request-id'] as string | undefined) ?? crypto.randomUUID();

    res.setHeader('X-Request-ID', correlationId);

    this.correlationIdService.run(correlationId, () => next());
  }
}
