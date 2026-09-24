import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { unauthorized } from '../../common/api-error';
import type { AuthenticatedRequest, CoreHubIdentity } from '../core-hub-identity';

/** ตัวตนที่ผ่านการตรวจ token แล้ว (CoreHubJwtGuard เป็นผู้ใส่) */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CoreHubIdentity => {
    const identity = context.switchToHttp().getRequest<AuthenticatedRequest>().identity;
    if (!identity) throw unauthorized();
    return identity;
  },
);
