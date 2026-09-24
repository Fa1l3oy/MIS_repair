import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { Permission } from '../auth/permissions';
import { ApiEnvelope, ApiErrors, ApiPageEnvelope, DeletedDto } from '../common/swagger';
import { UuidParam } from '../common/uuid.pipe';
import { BuildingDto, CreateBuildingDto, ListBuildingsQueryDto, UpdateBuildingDto } from './buildings.dto';
import { BuildingsService } from './buildings.service';

/** อาคารที่รับแจ้งซ่อม — ทุกคนอ่านได้ · เพิ่ม/แก้/ลบเฉพาะผู้ดูแลระบบแจ้งซ่อม */
@ApiTags('buildings')
@ApiBearerAuth()
@Controller('v1/buildings')
export class BuildingsController {
  constructor(private readonly buildings: BuildingsService) {}

  @Get()
  @RequirePermissions(Permission.BUILDING_READ)
  @ApiOperation({ summary: 'รายการอาคาร' })
  @ApiPageEnvelope(BuildingDto)
  @ApiErrors(400, 403)
  list(@Query() query: ListBuildingsQueryDto) {
    return this.buildings.list(query);
  }

  @Get(':id')
  @RequirePermissions(Permission.BUILDING_READ)
  @ApiOperation({ summary: 'ข้อมูลอาคาร' })
  @ApiEnvelope(BuildingDto)
  @ApiErrors(400, 403, 404)
  get(@Param('id', UuidParam) id: string) {
    return this.buildings.get(id);
  }

  @Post()
  @RequirePermissions(Permission.BUILDING_CREATE)
  @ApiOperation({ summary: 'เพิ่มอาคาร' })
  @ApiEnvelope(BuildingDto, { status: 201 })
  @ApiErrors(400, 403, 409)
  create(@Body() dto: CreateBuildingDto) {
    return this.buildings.create(dto);
  }

  @Patch(':id')
  @RequirePermissions(Permission.BUILDING_UPDATE)
  @ApiOperation({ summary: 'แก้ไขอาคาร / เปิด-ปิดการใช้งาน' })
  @ApiEnvelope(BuildingDto)
  @ApiErrors(400, 403, 404, 409)
  update(@Param('id', UuidParam) id: string, @Body() dto: UpdateBuildingDto) {
    return this.buildings.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.BUILDING_DELETE)
  @ApiOperation({ summary: 'ลบอาคารที่ยังไม่มีข้อมูลอ้างถึง' })
  @ApiEnvelope(DeletedDto)
  @ApiErrors(400, 403, 404, 409)
  remove(@Param('id', UuidParam) id: string) {
    return this.buildings.remove(id);
  }
}
