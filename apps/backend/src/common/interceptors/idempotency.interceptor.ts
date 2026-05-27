import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ConflictException,
} from '@nestjs/common';
import { Observable, throwError, from } from 'rxjs';
import { concatMap, catchError, map } from 'rxjs/operators';
import type { Request, Response } from 'express';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/modules/prisma/prisma.service';
import type { RequestUser } from '@/common/types/request-user.interface';

// Why idempotency keys on POST /orders?
// Mobile clients and unreliable networks will retry failed HTTP requests.
// Without idempotency, the user gets charged twice and receives two orders.
// The client sends a unique `X-Idempotency-Key` (e.g. UUID v4) per intent.
// Any subsequent request with the same key returns the cached first response
// instead of re-running the handler.
//
// Key lifecycle:
//   1. Key not seen → create in-flight marker, proceed, cache result.
//   2. Key seen, processedAt set → return cached response immediately.
//   3. Key seen, processedAt null → request is in-flight, return 409.
//   4. Handler throws → delete in-flight marker (client may retry).
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const key = req.headers['x-idempotency-key'];
    const userId = (req.user as RequestUser | undefined)?.id;

    if (!key || typeof key !== 'string' || !userId) {
      return next.handle();
    }

    return from(this.checkAndReserveKey(context, key, userId)).pipe(
      concatMap((cached) => {
        if (cached !== null) return from([cached]);
        return next.handle().pipe(
          concatMap((body: unknown) =>
            from(this.cacheResponse(userId, key, body)).pipe(map(() => body)),
          ),
          catchError((error: unknown) => {
            void this.releaseKey(userId, key);
            return throwError(() => error);
          }),
        );
      }),
    );
  }

  private async checkAndReserveKey(
    context: ExecutionContext,
    key: string,
    userId: string,
  ): Promise<unknown | null> {
    const existing = await this.prisma.idempotencyKey.findUnique({
      where: { userId_key: { userId, key } },
    });

    if (existing?.processedAt) {
      const res = context.switchToHttp().getResponse<Response>();
      res.status(existing.statusCode);
      return existing.responseBody;
    }

    if (existing) {
      throw new ConflictException('This request is already being processed');
    }

    await this.prisma.idempotencyKey.create({
      data: { userId, key, statusCode: 201, responseBody: {} },
    });

    return null;
  }

  private async cacheResponse(userId: string, key: string, body: unknown): Promise<void> {
    await this.prisma.idempotencyKey.update({
      where: { userId_key: { userId, key } },
      data: {
        responseBody: body as Prisma.InputJsonValue,
        statusCode: 201,
        processedAt: new Date(),
      },
    });
  }

  private async releaseKey(userId: string, key: string): Promise<void> {
    await this.prisma.idempotencyKey.deleteMany({
      where: { userId, key, processedAt: null },
    });
  }
}
