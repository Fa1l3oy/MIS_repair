import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { Permission } from '../auth/permissions';
import { ApiEnvelope, ApiErrors, ApiPageEnvelope, DeletedDto } from '../common/swagger';
import { UuidParam } from '../common/uuid.pipe';
import { CreateQrTagDto, ListQrTagsQueryDto, QrTagDto, UpdateQrTagDto } from './qr-tags.dto';
import { QrTagsService } from './qr-tags.service';

/**
 * สติกเกอร์ QR ติดที่ห้อง/อุปกรณ์ — สแกนแล้วเปิดฟอร์มแจ้งซ่อมที่กรอกสถานที่ไว้ให้
 * ทุกคนค้นด้วยรหัสได้ (ตอนสแกน) · สร้าง/แก้/ลบเฉพาะผู้ดูแลระบบ
 */
@ApiTags('qr-tags')
@ApiBearerAuth()
@Controller('v1/qr-tags')
export class QrTagsController {
  constructor(private readonly qrTags: QrTagsService) {}

  @Get()
  @RequirePermissions(Permission.QR_TAG_READ)
  @ApiOperation({ summary: 'รายการสติกเกอร์ QR (?code= สำหรับหน้าสแกน)' })
  @ApiPageEnvelope(QrTagDto)
  @ApiErrors(400, 403)
  list(@Query() query: ListQrTagsQueryDto) {
    return this.qrTags.list(query);
  }

  @Get(':id')
  @RequirePermissions(Permission.QR_TAG_READ)
  @ApiOperation({ summary: 'ข้อมูลสติกเกอร์ QR' })
  @ApiEnvelope(QrTagDto)
  @ApiErrors(400, 403, 404)
  get(@Param('id', UuidParam) id: string) {
    return this.qrTags.get(id);
  }

  @Post()
  @RequirePermissions(Permission.QR_TAG_CREATE)
  @ApiOperation({ summary: 'สร้างสติกเกอร์ QR (ระบบสุ่มรหัส 8 ตัวให้)' })
  @ApiEnvelope(QrTagDto, { status: 201 })
  @ApiErrors(400, 403)
  create(@Body() dto: CreateQrTagDto) {
    return this.qrTags.create(dto);
  }

  @Patch(':id')
  @RequirePermissions(Permission.QR_TAG_UPDATE)
  @ApiOperation({ summary: 'แก้ไขสถานที่/อุปกรณ์ของสติกเกอร์ (รหัสเดิม ไม่ต้องพิมพ์ใหม่)' })
  @ApiEnvelope(QrTagDto)
  @ApiErrors(400, 403, 404)
  update(@Param('id', UuidParam) id: string, @Body() dto: UpdateQrTagDto) {
    return this.qrTags.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.QR_TAG_DELETE)
  @ApiOperation({ summary: 'ลบสติกเกอร์ (ใบแจ้งซ่อมเดิมยังอยู่)' })
  @ApiEnvelope(DeletedDto)
  @ApiErrors(400, 403, 404)
  remove(@Param('id', UuidParam) id: string) {
    return this.qrTags.remove(id);
  }
}
