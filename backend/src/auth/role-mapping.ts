/** core role ปิด 4 ค่า (standards/contracts/vocabulary.json → coreRoles) */
export const CORE_ROLES = ['student', 'alumni', 'staff', 'admin'] as const;
export type CoreRole = (typeof CORE_ROLES)[number];

/** role Layer 2 ของระบบนี้: ผู้แจ้งซ่อม · ช่างซ่อมบำรุง · ผู้ดูแลระบบแจ้งซ่อม (authorization.md ข้อ 3) */
export const SUBSYSTEM_ROLES = ['USER', 'TECHNICIAN', 'ADMIN'] as const;
export type SubsystemRole = (typeof SUBSYSTEM_ROLES)[number];

/**
 * Layer 1 → Layer 2 (authorization.md ข้อ 3)
 * ⚠️ ต้องตรงกับ default_role_mapping ในทะเบียนของ Core Hub เป๊ะ — key คือ core role ที่เข้าระบบนี้ได้
 * - นักศึกษาและบุคลากรแจ้งซ่อมได้ (USER) · ผู้ดูแลระบบของ Core Hub เป็น ADMIN
 * - ศิษย์เก่าไม่ได้ใช้อาคารสถานที่ของสาขาแล้ว → ไม่รับ (403)
 */
export const CORE_ROLE_TO_SUBSYSTEM_ROLE: Partial<Record<CoreRole, SubsystemRole>> = {
  student: 'USER',
  staff: 'USER',
  admin: 'ADMIN',
};

/** core role ที่ผู้ดูแลระบบนี้แต่งตั้งเป็นช่างได้ (นักศึกษาช่วยงานต้องขอ exception เป็น staff ที่ Registry ก่อน) */
export const TECHNICIAN_ELIGIBLE_CORE_ROLE: CoreRole = 'staff';

export function mapCoreRole(coreRole: string): SubsystemRole | null {
  if (!(CORE_ROLES as readonly string[]).includes(coreRole)) return null;
  return CORE_ROLE_TO_SUBSYSTEM_ROLE[coreRole as CoreRole] ?? null;
}

/**
 * role Layer 2 ที่ใช้จริง = role mapping + การแต่งตั้งช่างที่เก็บในระบบนี้
 * (TECHNICIAN ไม่มี core role ของตัวเอง — data-dictionary.md ข้อ 10: Layer 2 Role เป็นของระบบย่อย)
 */
export function resolveSubsystemRole(coreRole: string, isTechnician: boolean): SubsystemRole | null {
  const mapped = mapCoreRole(coreRole);
  if (mapped === 'USER' && isTechnician && coreRole === TECHNICIAN_ELIGIBLE_CORE_ROLE) return 'TECHNICIAN';
  return mapped;
}
