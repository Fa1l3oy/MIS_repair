import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { forbidden } from '../../common/api-error';
import { logEvent } from '../../logging/log-event';
import type { AuthenticatedRequest } from '../core-hub-identity';
import { REQUIRED_PERMISSIONS } from '../decorators/require-permissions.decorator';
import type { PermissionValue } from '../permissions';

/** สิทธิ์ไม่พอ → 403 เสมอ (ห้าม 401 หรือ 404) — authorization.md ข้อ 5 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<PermissionValue[]>(REQUIRED_PERMISSIONS, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const identity = req.identity;
    if (identity && required.some((permission) => identity.permissions.has(permission))) return true;

    logEvent('authorization.denied', {
      sub: identity?.coreUserId ?? null,
      subsystemRole: identity?.subsystemRole ?? null,
      required,
      reason: 'missing_permission',
      path: req.path,
    });
    throw forbidden();
  }
}
