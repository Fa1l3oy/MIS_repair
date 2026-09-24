import type { Profile } from '../../generated/prisma/client';
import { resolveSubsystemRole } from '../auth/role-mapping';
import type { ProfileDto } from './profiles.dto';

export function displayNameOf(profile: Pick<Profile, 'displayName' | 'email'>) {
  return profile.displayName?.trim() || profile.email.split('@')[0];
}

/**
 * URL รูปโปรไฟล์ (origin เดียวกับหน้าเว็บ) — ?v= เปลี่ยนทุกครั้งที่เปลี่ยนรูป เบราว์เซอร์จึง cache ได้ยาว
 * null = ยังไม่มีรูป ให้หน้าเว็บแสดงอักษรย่อแทน
 */
export function avatarUrlOf(profile: Pick<Profile, 'id' | 'avatarFilename'>) {
  if (!profile.avatarFilename) return null;
  return `/api/v1/profiles/${profile.id}/avatar?v=${profile.avatarFilename.slice(0, 8)}`;
}

type PersonSource = Pick<
  Profile,
  'id' | 'coreUserId' | 'displayName' | 'email' | 'phone' | 'workUnit' | 'avatarFilename'
>;

/** ข้อมูลย่อของบุคคลที่แนบไปกับใบแจ้งซ่อม (ผู้แจ้ง / ช่าง / ผู้ทำรายการ) */
export function toPersonView(profile: PersonSource) {
  return {
    coreUserId: profile.coreUserId,
    displayName: displayNameOf(profile),
    email: profile.email,
    phone: profile.phone,
    workUnit: profile.workUnit,
    avatarUrl: avatarUrlOf(profile),
  };
}

export function toProfileView(profile: Profile): ProfileDto {
  return {
    id: profile.id,
    coreUserId: profile.coreUserId,
    email: profile.email,
    coreRole: profile.coreRole,
    subsystemRole: resolveSubsystemRole(profile.coreRole, profile.isTechnician),
    isTechnician: profile.isTechnician,
    displayName: displayNameOf(profile),
    phone: profile.phone,
    workUnit: profile.workUnit,
    avatarUrl: avatarUrlOf(profile),
    lastSeenAt: profile.lastSeenAt?.toISOString() ?? null,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
}

export type PersonView = ReturnType<typeof toPersonView>;
