import type { SubsystemRole } from './role-mapping';

/**
 * Permission ของโดเมนแจ้งซ่อม — รูปแบบ <resource>:<action>[:own|:any] (authorization.md ข้อ 4)
 * :own = record.core_user_id === token.sub (ตรวจกับข้อมูลจริงในชั้น service อีกชั้น)
 */
export const Permission = {
  REPAIR_REQUEST_CREATE: 'repair-request:create',
  REPAIR_REQUEST_READ_OWN: 'repair-request:read:own',
  REPAIR_REQUEST_READ_ANY: 'repair-request:read:any',
  REPAIR_REQUEST_CANCEL_OWN: 'repair-request:cancel:own',
  REPAIR_REQUEST_RATE_OWN: 'repair-request:rate:own',
  REPAIR_REQUEST_COMMENT_OWN: 'repair-request:comment:own',
  REPAIR_REQUEST_COMMENT_ANY: 'repair-request:comment:any',
  REPAIR_JOB_ACCEPT: 'repair-job:accept',
  REPAIR_JOB_UPDATE_OWN: 'repair-job:update:own',
  REPAIR_JOB_UPDATE_ANY: 'repair-job:update:any',
  REPAIR_JOB_ASSIGN: 'repair-job:assign',
  REPAIR_REPORT_EXPORT: 'repair-report:export',
  STATISTICS_READ: 'statistics:read',
  BUILDING_READ: 'building:read',
  BUILDING_CREATE: 'building:create',
  BUILDING_UPDATE: 'building:update',
  BUILDING_DELETE: 'building:delete',
  CATEGORY_READ: 'category:read',
  CATEGORY_CREATE: 'category:create',
  CATEGORY_UPDATE: 'category:update',
  CATEGORY_DELETE: 'category:delete',
  QR_TAG_READ: 'qr-tag:read',
  QR_TAG_CREATE: 'qr-tag:create',
  QR_TAG_DELETE: 'qr-tag:delete',
  PROFILE_READ_ANY: 'profile:read:any',
  PROFILE_UPDATE_OWN: 'profile:update:own',
  PROFILE_UPDATE_ANY: 'profile:update:any',
  NOTIFICATION_READ_OWN: 'notification:read:own',
  NOTIFICATION_UPDATE_OWN: 'notification:update:own',
} as const;

export type PermissionValue = (typeof Permission)[keyof typeof Permission];

const P = Permission;

const USER: PermissionValue[] = [
  P.REPAIR_REQUEST_CREATE,
  P.REPAIR_REQUEST_READ_OWN,
  P.REPAIR_REQUEST_CANCEL_OWN,
  P.REPAIR_REQUEST_RATE_OWN,
  P.REPAIR_REQUEST_COMMENT_OWN,
  P.BUILDING_READ,
  P.CATEGORY_READ,
  P.QR_TAG_READ,
  P.PROFILE_UPDATE_OWN,
  P.NOTIFICATION_READ_OWN,
  P.NOTIFICATION_UPDATE_OWN,
];

const TECHNICIAN: PermissionValue[] = [
  ...USER,
  P.REPAIR_REQUEST_READ_ANY,
  P.REPAIR_REQUEST_COMMENT_ANY,
  P.REPAIR_JOB_ACCEPT,
  P.REPAIR_JOB_UPDATE_OWN,
  P.REPAIR_REPORT_EXPORT,
  P.STATISTICS_READ,
];

const ADMIN: PermissionValue[] = [
  ...TECHNICIAN,
  P.REPAIR_JOB_UPDATE_ANY,
  P.REPAIR_JOB_ASSIGN,
  P.BUILDING_CREATE,
  P.BUILDING_UPDATE,
  P.BUILDING_DELETE,
  P.CATEGORY_CREATE,
  P.CATEGORY_UPDATE,
  P.CATEGORY_DELETE,
  P.QR_TAG_CREATE,
  P.QR_TAG_DELETE,
  P.PROFILE_READ_ANY,
  P.PROFILE_UPDATE_ANY,
];

/** เมทริกซ์สิทธิ์ที่เดียวของระบบ (authorization.md ข้อ 6) */
export const ROLE_PERMISSIONS: Record<SubsystemRole, ReadonlySet<PermissionValue>> = {
  USER: new Set(USER),
  TECHNICIAN: new Set(TECHNICIAN),
  ADMIN: new Set(ADMIN),
};

export function permissionsOf(role: SubsystemRole): ReadonlySet<PermissionValue> {
  return ROLE_PERMISSIONS[role];
}
