import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { RequestUser } from '@/common/types/request-user.interface';

export const GqlCurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser => {
    const gqlCtx = GqlExecutionContext.create(ctx);
    return gqlCtx.getContext<{ req: { user: RequestUser } }>().req.user;
  },
);
