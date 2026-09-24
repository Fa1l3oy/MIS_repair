import { Injectable } from '@nestjs/common';
import { forbidden } from '../common/api-error';
import { logEvent } from '../logging/log-event';
import { ProfilesService } from '../profiles/profiles.service';
import type { CoreHubIdentity, VerifiedClaims } from './core-hub-identity';
import { permissionsOf } from './permissions';
import { mapCoreRole, resolveSubsystemRole, type CoreRole } from './role-mapping';

/** แปลง claim ที่ตรวจแล้ว → ตัวตน + role + permission ของระบบนี้ */
@Injectable()
export class IdentityService {
  constructor(private readonly profiles: ProfilesService) {}

  async resolve(claims: VerifiedClaims): Promise<CoreHubIdentity> {
    if (!mapCoreRole(claims.role)) {
      logEvent('authorization.role_mapping_failed', { sub: claims.sub, coreRole: claims.role });
      throw forbidden(
        'ระบบแจ้งซ่อมไม่เปิดให้บทบาทนี้เข้าใช้งาน หากคิดว่าเป็นข้อผิดพลาด กรุณาติดต่อผู้ดูแลระบบย่อยนี้',
      );
    }

    const profile = await this.profiles.touch(claims);
    const subsystemRole = resolveSubsystemRole(claims.role, profile.isTechnician)!;

    logEvent('jwt.verification.success', { sub: claims.sub, coreRole: claims.role, subsystemRole });
    return {
      coreUserId: claims.sub,
      email: claims.email,
      coreRole: claims.role as CoreRole,
      subsystemRole,
      permissions: permissionsOf(subsystemRole),
      tokenExpiresAt: claims.exp,
    };
  }
}
