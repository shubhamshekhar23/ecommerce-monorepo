import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import { PUBLIC_KEY } from '@/common/decorators';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') implements CanActivate {
  private readonly logger = new Logger('JwtAuthGuard');

  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    if (this.isPublic(context)) {
      return true;
    }

    return super.canActivate(context);
  }

  /*
   - passport-jwt calls getRequest to extract the bearer token.
   - For GraphQL requests the HTTP adapter object is empty; we must read
   - from the GraphQL execution context instead.
   */
  getRequest(context: ExecutionContext): Request {
    if (context.getType<string>() === 'graphql') {
      return GqlExecutionContext.create(context).getContext<{ req: Request }>().req;
    }
    return context.switchToHttp().getRequest<Request>();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleRequest(err: any, user: any, _info: any, context: ExecutionContext) {
    if (err || !user) {
      const path =
        context.getType<string>() === 'graphql'
          ? 'GraphQL'
          : (() => {
              const req = context.switchToHttp().getRequest<Request>();
              return `${req.method} ${req.url}`;
            })();
      this.logger.warn(`Unauthorized access attempt to ${path}`);
      throw err || new UnauthorizedException('Missing or invalid token');
    }
    return user;
  }

  private isPublic(context: ExecutionContext): boolean {
    return this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
  }
}
