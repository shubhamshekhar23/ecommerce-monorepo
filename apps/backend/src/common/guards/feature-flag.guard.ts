import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { RequestUser } from '@/common/types/request-user.interface';
import { FeatureFlagService } from '@/modules/feature-flags/feature-flag.service';
import { FEATURE_FLAG_KEY } from '@/common/decorators/feature-flag.decorator';

@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly flags: FeatureFlagService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const flagName = this.reflector.getAllAndOverride<string | undefined>(FEATURE_FLAG_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!flagName) return true;

    const req = context.switchToHttp().getRequest<Request & { user?: RequestUser }>();
    const userId = req.user?.id;
    const enabled = await this.flags.isEnabled(flagName, userId);
    if (!enabled) throw new ForbiddenException(`Feature '${flagName}' is not enabled`);
    return true;
  }
}
