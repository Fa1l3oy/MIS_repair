import { Body, Controller, Delete, Get, Patch, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Profile } from '../../generated/prisma/client';
import { avatarUrlOf, toProfileView } from '../profiles/profile.view';
import { MeDto, UpdateMyProfileDto } from '../profiles/profiles.dto';
import { ProfilesService } from '../profiles/profiles.service';
import { ApiEnvelope, ApiErrors, DeletedDto } from '../common/swagger';
import { MAX_IMAGE_BYTES, type UploadedImage } from '../repair-images/image-storage';
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

  @Post('avatar')
  @RequirePermissions(Permission.PROFILE_UPDATE_OWN)
  @UseInterceptors(FileInterceptor('avatar', { limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 0 } }))
  @ApiOperation({ summary: 'เปลี่ยนรูปโปรไฟล์ของตัวเอง (JPG · PNG · WebP ไม่เกิน 2 MB ในช่อง avatar)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['avatar'],
      properties: { avatar: { type: 'string', format: 'binary' } },
    },
  })
  @ApiEnvelope(MeDto, { status: 201 })
  @ApiErrors(400, 403, 409)
  async uploadAvatar(@CurrentUser() user: CoreHubIdentity, @UploadedFile() file: UploadedImage | undefined) {
    return this.view(user, await this.profiles.setAvatar(user.coreUserId, file));
  }

  @Delete('avatar')
  @RequirePermissions(Permission.PROFILE_UPDATE_OWN)
  @ApiOperation({ summary: 'ลบรูปโปรไฟล์ของตัวเอง (กลับไปใช้อักษรย่อ)' })
  @ApiEnvelope(DeletedDto)
  @ApiErrors(403, 404, 409)
  removeAvatar(@CurrentUser() user: CoreHubIdentity) {
    return this.profiles.removeAvatar(user.coreUserId);
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
      avatarUrl: avatarUrlOf(profile),
      sessionExpiresAt: new Date(user.tokenExpiresAt * 1000).toISOString(),
    };
  }
}
