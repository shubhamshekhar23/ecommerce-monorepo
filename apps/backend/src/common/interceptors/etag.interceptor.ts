import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, EMPTY, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { createHash } from 'crypto';
import type { Request, Response } from 'express';

@Injectable()
export class EtagInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const req = context.switchToHttp().getRequest<Request>();
    if (req.method !== 'GET') return next.handle();

    const res = context.switchToHttp().getResponse<Response>();
    return next.handle().pipe(
      switchMap((body) => {
        /*
         - SSE and other streaming responses flush headers immediately; setting
         - a new header after that throws "Cannot set headers after they are sent".
         - Skip ETag generation for any response that is already streaming.
         */
        if (res.headersSent) return of(body);

        const etag = `"${createHash('sha1').update(JSON.stringify(body)).digest('hex')}"`;
        res.setHeader('ETag', etag);
        if (req.headers['if-none-match'] === etag) {
          res.status(304).end();
          return EMPTY;
        }
        return of(body);
      }),
    );
  }
}
