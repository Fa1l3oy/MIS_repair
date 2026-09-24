import { SetMetadata } from '@nestjs/common';
import type { PermissionValue } from '../permissions';

export const REQUIRED_PERMISSIONS = 'csmju:requiredPermissions';

/** ต้องมี permission อย่างน้อยหนึ่งข้อ — service ต้องตรวจ ownership (:own) กับข้อมูลจริงต่ออีกชั้น */
export const RequirePermissions = (...permissions: PermissionValue[]) =>
  SetMetadata(REQUIRED_PERMISSIONS, permissions);
