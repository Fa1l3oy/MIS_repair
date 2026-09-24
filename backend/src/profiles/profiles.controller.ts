import { Body, Controller, Get, Param, Patch, Query, Res, StreamableFile } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProduces, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ApiEnvelope, ApiErrors, ApiPageEnvelope } from '../common/swagger';
import { UuidParam } from '../common/uuid.pipe';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { Permission } from '../auth/permissions';
import { ListProfilesQueryDto, ProfileDto, UpdateProfileDto } from './profiles.dto';
import { ProfilesService } from './profiles.service';

/** ผู้ใช้ที่เคยเข้าระบบนี้ + การแต่งตั้งช่าง (เฉพาะผู้ดูแลระบบแจ้งซ่อม) */
@ApiTags('profiles')
@ApiBearerAuth()
@Controller('v1/profiles')
export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) {}

  @Get()
  @RequirePermissions(Permission.PROFILE_READ_ANY)
  @ApiOperation({ summary: 'ผู้ใช้ที่เคยเข้าระบบนี้' })
  @ApiPageEnvelope(ProfileDto)
  @ApiErrors(400, 403)
  list(@Query() query: ListProfilesQueryDto) {
    return this.profiles.list(query);
  }

  /** ไฟล์รูปโปรไฟล์ (binary ไม่ห่อ envelope — ข้อยกเว้นเดียวกับไฟล์รูปงานซ่อม) · ผู้ใช้ที่เข้าระบบแล้วทุกคนเห็นได้ */
  @Get(':id/avatar')
  @ApiOperation({ summary: 'รูปโปรไฟล์ (image/jpeg · image/png · image/webp)' })
  @ApiProduces('image/jpeg', 'image/png', 'image/webp')
  @ApiResponse({ status: 200, description: 'ไฟล์รูป', schema: { type: 'string', format: 'binary' } })
  @ApiErrors(400, 404)
  async avatar(@Param('id', UuidParam) id: string, @Res({ passthrough: true }) res: Response) {
    const file = await this.profiles.openAvatar(id);
    // URL มี ?v= ที่เปลี่ยนตามรูป — cache ได้ยาวโดยไม่ค้างรูปเก่า
    res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return new StreamableFile(file.stream, { type: file.type, length: file.size, disposition: 'inline' });
  }

  @Patch(':id')
  @RequirePermissions(Permission.PROFILE_UPDATE_ANY)
  @ApiOperation({ summary: 'แต่งตั้ง/ถอดถอนช่างซ่อมบำรุง' })
  @ApiEnvelope(ProfileDto)
  @ApiErrors(400, 403, 404, 409)
  update(@Param('id', UuidParam) id: string, @Body() dto: UpdateProfileDto) {
    return this.profiles.setTechnician(id, dto.isTechnician);
  }
}
