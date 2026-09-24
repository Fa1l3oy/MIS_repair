import { Permission, ROLE_PERMISSIONS } from './permissions';
import { CORE_ROLE_TO_SUBSYSTEM_ROLE, mapCoreRole, resolveSubsystemRole } from './role-mapping';

describe('role mapping (authorization.md ข้อ 3)', () => {
  it('matches the default_role_mapping registered with Core Hub', () => {
    // ค่าเดียวกับ core-hub-dev/register-subsystem.js และทะเบียนจริง — เปลี่ยนที่หนึ่งต้องเปลี่ยนอีกที่
    expect(CORE_ROLE_TO_SUBSYSTEM_ROLE).toEqual({ student: 'USER', staff: 'USER', admin: 'ADMIN' });
  });

  it('refuses core roles that are not in the table (→ 403 at the guard)', () => {
    expect(mapCoreRole('alumni')).toBeNull();
    expect(mapCoreRole('superuser')).toBeNull();
    expect(mapCoreRole('')).toBeNull();
  });

  it('turns an appointed staff member into a TECHNICIAN, nobody else', () => {
    expect(resolveSubsystemRole('staff', true)).toBe('TECHNICIAN');
    expect(resolveSubsystemRole('staff', false)).toBe('USER');
    expect(resolveSubsystemRole('student', true)).toBe('USER');
    expect(resolveSubsystemRole('admin', true)).toBe('ADMIN');
    expect(resolveSubsystemRole('alumni', true)).toBeNull();
  });

  it('keeps the permission matrix cumulative USER ⊂ TECHNICIAN ⊂ ADMIN', () => {
    for (const permission of ROLE_PERMISSIONS.USER)
      expect(ROLE_PERMISSIONS.TECHNICIAN.has(permission)).toBe(true);
    for (const permission of ROLE_PERMISSIONS.TECHNICIAN)
      expect(ROLE_PERMISSIONS.ADMIN.has(permission)).toBe(true);
  });

  it('uses <resource>:<action>[:own|:any] names only', () => {
    for (const permission of Object.values(Permission)) {
      expect(permission).toMatch(/^[a-z]+(-[a-z]+)*:[a-z]+(-[a-z]+)*(:(own|any))?$/);
    }
  });
});
