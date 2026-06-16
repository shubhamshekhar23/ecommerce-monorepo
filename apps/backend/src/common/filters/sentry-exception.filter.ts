import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import type { Request, Response } from 'express';
import { HttpExceptionFilter } from './http-exception.filter';

const httpFilter = new HttpExceptionFilter();

function getStatus(exception: unknown): number {
  return exception instanceof HttpException ? exception.getStatus() : 500;
}

/*
 - Outermost global filter — wraps HttpExceptionFilter.
 - Captures exceptions in Sentry when status >= 500; skips client errors (< 500).
 - Sets user context from x-user-id header so errors are attributable in Sentry.
 */
@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    if (getStatus(exception) >= 500) {
      const req = host.switchToHttp().getRequest<Request>();
      Sentry.withScope((scope) => {
        scope.setUser({ id: req.headers['x-user-id'] as string | undefined });
        scope.setExtra('method', req.method);
        scope.setExtra('url', req.url);
        Sentry.captureException(exception);
      });
    }

    if (exception instanceof HttpException) {
      httpFilter.catch(exception, host);
      return;
    }

    const res = host.switchToHttp().getResponse<Response>();
    const req = host.switchToHttp().getRequest<Request>();
    res.status(500).json({
      statusCode: 500,
      timestamp: new Date().toISOString(),
      path: req.url,
      message: 'Internal server error',
    });
  }
}
