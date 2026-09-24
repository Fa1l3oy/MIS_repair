/**
 * การแสดงผลตามสิทธิ์ Layer 2 (ui-design-system.md ข้อ 10) — ใช้ permissions ที่ backend ส่งมาใน /api/v1/me
 * UI แค่ "ไม่แสดงสิ่งที่ทำไม่ได้" ส่วนการบังคับสิทธิ์จริงอยู่ที่ backend เสมอ
 */
import type { Me } from './types';

export const P = {
  REQUEST_CREATE: 'repair-request:create',
  REQUEST_READ_ANY: 'repair-request:read:any',
  JOB_ACCEPT: 'repair-job:accept',
  JOB_ASSIGN: 'repair-job:assign',
  STATISTICS_READ: 'statistics:read',
  BUILDING_CREATE: 'building:create',
  CATEGORY_CREATE: 'category:create',
  QR_TAG_CREATE: 'qr-tag:create',
  PROFILE_READ_ANY: 'profile:read:any',
} as const;

export function can(user: Pick<Me, 'permissions'> | null | undefined, permission: string) {
  return Boolean(user?.permissions.includes(permission));
}

export const isStaffSide = (user: Pick<Me, 'permissions'>) => can(user, P.REQUEST_READ_ANY);
export const isAdmin = (user: Pick<Me, 'permissions'>) => can(user, P.PROFILE_READ_ANY);
