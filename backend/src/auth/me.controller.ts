import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Profile } from '../../generated/prisma/client';
import { toProfileView } from '../profiles/profile.view';
import { MeDto, UpdateMyProfileDto } from '../profiles/profiles.dto';
import { ProfilesService } from '../profiles/profiles.service';
import { ApiEnvelope, ApiErrors } from '../common/swagger';
import type { CoreHubIdentity } from './core-hub-identity';
import { CurrentUser } from './decorators/current-user.decorator';
import { RequirePermissions } from './decorators/require-permissions.decorator';
import { Permission } from './permissions';

/**
 * GET /api/v1/me — ตัวตนของผู้เรียกจาก token ที่ตรวจแล้ว + ข้อมูล local ของระบบนี้
 * `id` = claim `sub` (conformance L1-10) · `coreRole` = claim `role` (L1-11)
 */
@ApiTags('me')
@ApiBearerAuth()
@Controller('v1/me')
export class MeController {
  constructor(private readonly profiles: ProfilesService) {}

  @Get()
  @ApiOperation({ summary: 'ตัวตนของผู้เรียก + role/permission ในระบบนี้' })
  @ApiEnvelope(MeDto)
  @ApiErrors(403)
  async me(@CurrentUser() user: CoreHubIdentity) {
    return this.view(user, await this.profiles.getByCoreUserId(user.coreUserId));
  }

  @Patch()
  @RequirePermissions(Permission.PROFILE_UPDATE_OWN)
  @ApiOperation({ summary: 'แก้ข้อมูลติดต่อของตัวเอง (ชื่อที่แสดง เบอร์โทร หน่วยงาน)' })
  @ApiEnvelope(MeDto)
  @ApiErrors(400, 403)
  async update(@CurrentUser() user: CoreHubIdentity, @Body() dto: UpdateMyProfileDto) {
    return this.view(user, await this.profiles.updateMine(user.coreUserId, dto));
  }

  private view(user: CoreHubIdentity, profile: Profile): MeDto {
    const local = toProfileView(profile);
    return {
      id: user.coreUserId,
      email: user.email,
      coreRole: user.coreRole,
      subsystemRole: user.subsystemRole,
      permissions: [...user.permissions].sort(),
      displayName: local.displayName,
      hasDisplayName: Boolean(profile.displayName),
      phone: local.phone,
      workUnit: local.workUnit,
      sessionExpiresAt: new Date(user.tokenExpiresAt * 1000).toISOString(),
    };
  }
}
