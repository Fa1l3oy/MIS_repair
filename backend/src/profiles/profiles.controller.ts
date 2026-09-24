import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UuidParam } from '../common/uuid.pipe';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { Permission } from '../auth/permissions';
import { ListProfilesQueryDto, UpdateProfileDto } from './profiles.dto';
import { ProfilesService } from './profiles.service';

/** ผู้ใช้ที่เคยเข้าระบบนี้ + การแต่งตั้งช่าง (เฉพาะผู้ดูแลระบบแจ้งซ่อม) */
@ApiTags('profiles')
@ApiBearerAuth()
@Controller('v1/profiles')
export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) {}

  @Get()
  @RequirePermissions(Permission.PROFILE_READ_ANY)
  list(@Query() query: ListProfilesQueryDto) {
    return this.profiles.list(query);
  }

  @Patch(':id')
  @RequirePermissions(Permission.PROFILE_UPDATE_ANY)
  update(@Param('id', UuidParam) id: string, @Body() dto: UpdateProfileDto) {
    return this.profiles.setTechnician(id, dto.isTechnician);
  }
}
