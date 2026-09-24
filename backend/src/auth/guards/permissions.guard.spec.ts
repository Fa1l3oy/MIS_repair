import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { identity } from '../../__tests__/fixtures';
import { ApiError } from '../../common/api-error';
import type { CoreHubIdentity } from '../core-hub-identity';
import { REQUIRED_PERMISSIONS } from '../decorators/require-permissions.decorator';
import { Permission, type PermissionValue } from '../permissions';
import { PermissionsGuard } from './permissions.guard';

function contextFor(required: PermissionValue[] | undefined, user?: CoreHubIdentity): ExecutionContext {
  const handler = () => undefined;
  if (required) Reflect.defineMetadata(REQUIRED_PERMISSIONS, required, handler);
  return {
    getHandler: () => handler,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => ({ identity: user, path: '/api/v1/buildings' }) }),
  } as unknown as ExecutionContext;
}

describe('PermissionsGuard — สิทธิ์ไม่พอต้องเป็น 403 (authorization.md ข้อ 5)', () => {
  const guard = new PermissionsGuard(new Reflector());

  it('lets a request through when the route declares no permission', () => {
    expect(guard.canActivate(contextFor(undefined, identity('USER')))).toBe(true);
  });

  it('allows when the caller holds at least one of the listed permissions', () => {
    const ctx = contextFor(
      [Permission.REPAIR_REQUEST_READ_OWN, Permission.REPAIR_REQUEST_READ_ANY],
      identity('USER'),
    );
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('answers 403 FORBIDDEN (not 401/404) when a USER tries to create a building', () => {
    const ctx = contextFor([Permission.BUILDING_CREATE], identity('USER'));
    try {
      guard.canActivate(ctx);
      fail('expected FORBIDDEN');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).getStatus()).toBe(403);
      expect((error as ApiError).code).toBe('FORBIDDEN');
    }
  });

  it('a TECHNICIAN may accept jobs but not assign them', () => {
    expect(guard.canActivate(contextFor([Permission.REPAIR_JOB_ACCEPT], identity('TECHNICIAN')))).toBe(true);
    expect(() =>
      guard.canActivate(contextFor([Permission.REPAIR_JOB_ASSIGN], identity('TECHNICIAN'))),
    ).toThrow(ApiError);
  });
});
