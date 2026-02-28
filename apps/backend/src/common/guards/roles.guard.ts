import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '@/common/decorators';
import { UserRole } from '@prisma/client';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger('RolesGuard');

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.getRoles(context);
    if (!requiredRoles.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) {
      this.logger.warn('RolesGuard: User not found in request');
      throw new ForbiddenException('Access denied');
    }

    if (!requiredRoles.includes(user.role)) {
      this.logger.warn(`User ${user.id} with role ${user.role} attempted unauthorized access`);
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }

  private getRoles(context: ExecutionContext): UserRole[] {
    return (
      this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || []
    );
  }
}
