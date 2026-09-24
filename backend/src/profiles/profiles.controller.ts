import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
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

  @Patch(':id')
  @RequirePermissions(Permission.PROFILE_UPDATE_ANY)
  @ApiOperation({ summary: 'แต่งตั้ง/ถอดถอนช่างซ่อมบำรุง' })
  @ApiEnvelope(ProfileDto)
  @ApiErrors(400, 403, 404, 409)
  update(@Param('id', UuidParam) id: string, @Body() dto: UpdateProfileDto) {
    return this.profiles.setTechnician(id, dto.isTechnician);
  }
}
