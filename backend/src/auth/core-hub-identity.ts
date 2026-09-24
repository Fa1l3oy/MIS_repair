import type { Request } from 'express';
import type { CoreRole, SubsystemRole } from './role-mapping';
import type { PermissionValue } from './permissions';

/** claim ที่ผ่านการตรวจลายเซ็นแล้วเท่านั้น (auth-contract.md ข้อ 3) */
export type VerifiedClaims = {
  sub: string;
  email: string;
  role: string;
  sid?: string;
  exp: number;
};

/** ตัวตนของผู้เรียกใน request นี้ — identity มาจาก token เท่านั้น ไม่เชื่อ body/query/header อื่น */
export type CoreHubIdentity = {
  coreUserId: string;
  email: string;
  coreRole: CoreRole;
  subsystemRole: SubsystemRole;
  permissions: ReadonlySet<PermissionValue>;
  tokenExpiresAt: number;
};

export type AuthenticatedRequest = Request & { identity?: CoreHubIdentity };
