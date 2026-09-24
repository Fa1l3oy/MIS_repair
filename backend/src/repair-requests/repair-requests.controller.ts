import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiExtraModels,
  ApiOperation,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import type { CoreHubIdentity } from '../auth/core-hub-identity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { Permission } from '../auth/permissions';
import { ApiEnvelope, ApiErrors, ApiPageEnvelope } from '../common/swagger';
import { UuidParam } from '../common/uuid.pipe';
import { MAX_IMAGE_BYTES, MAX_IMAGES_PER_UPLOAD } from '../repair-images/image-storage';
import {
  AssignRepairRequestDto,
  CancelRepairRequestDto,
  ChangeStatusDto,
  CreateCommentDto,
  CreateRepairRequestDto,
  ListRepairRequestsQueryDto,
  RateRepairRequestDto,
  RepairRequestDetailDto,
  RepairRequestSummaryDto,
  RequestActivityDto,
  UpdateRepairRequestDto,
} from './repair-requests.dto';
import { RepairRequestsService } from './repair-requests.service';

/** รับรูปเข้าหน่วยความจำก่อน แล้ว ImageStorage ตรวจ magic bytes ก่อนเขียนลงดิสก์ */
const photos = () =>
  FilesInterceptor('photos', MAX_IMAGES_PER_UPLOAD, {
    limits: { fileSize: MAX_IMAGE_BYTES, files: MAX_IMAGES_PER_UPLOAD, fields: 20, fieldSize: 16 * 1024 },
  });

/** schema ของ multipart: ช่องข้อมูลของ DTO + ช่อง photos (ไฟล์ภาพสูงสุด 5 ไฟล์) */
const multipartBody = (dto: new () => unknown) =>
  ApiBody({
    schema: {
      allOf: [
        { $ref: getSchemaPath(dto) },
        {
          type: 'object',
          properties: {
            photos: {
              type: 'array',
              maxItems: MAX_IMAGES_PER_UPLOAD,
              items: { type: 'string', format: 'binary' },
              description: 'JPG / PNG / WebP ไม่เกิน 8 MB ต่อไฟล์',
            },
          },
        },
      ],
    },
  });

@ApiTags('repair-requests')
@ApiBearerAuth()
@ApiExtraModels(CreateRepairRequestDto, ChangeStatusDto)
@Controller('v1/repair-requests')
export class RepairRequestsController {
  constructor(private readonly requests: RepairRequestsService) {}

  @Get()
  @RequirePermissions(Permission.REPAIR_REQUEST_READ_OWN, Permission.REPAIR_REQUEST_READ_ANY)
  @ApiOperation({ summary: 'รายการใบแจ้งซ่อม (ของฉัน / งานที่ฉันรับผิดชอบ / ทั้งหมด)' })
  @ApiPageEnvelope(RepairRequestSummaryDto)
  @ApiErrors(400, 403)
  list(@CurrentUser() user: CoreHubIdentity, @Query() query: ListRepairRequestsQueryDto) {
    return this.requests.list(user, query);
  }

  @Get(':id')
  @RequirePermissions(Permission.REPAIR_REQUEST_READ_OWN, Permission.REPAIR_REQUEST_READ_ANY)
  @ApiOperation({ summary: 'รายละเอียดใบแจ้งซ่อม พร้อมรูป ประวัติ และสิ่งที่ผู้เรียกทำได้' })
  @ApiEnvelope(RepairRequestDetailDto)
  @ApiErrors(400, 403, 404)
  get(@CurrentUser() user: CoreHubIdentity, @Param('id', UuidParam) id: string) {
    return this.requests.get(user, id);
  }

  @Post()
  @RequirePermissions(Permission.REPAIR_REQUEST_CREATE)
  @UseInterceptors(photos())
  @ApiOperation({ summary: 'แจ้งซ่อม (แนบรูปได้สูงสุด 5 รูปในช่อง photos)' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @multipartBody(CreateRepairRequestDto)
  @ApiEnvelope(RepairRequestDetailDto, { status: 201 })
  @ApiErrors(400, 403)
  create(
    @CurrentUser() user: CoreHubIdentity,
    @Body() dto: CreateRepairRequestDto,
    @UploadedFiles() files: Express.Multer.File[] = [],
  ) {
    return this.requests.create(user, dto, files);
  }

  @Patch(':id')
  @RequirePermissions(Permission.REPAIR_JOB_UPDATE_OWN, Permission.REPAIR_JOB_UPDATE_ANY)
  @ApiOperation({ summary: 'เปลี่ยนความเร่งด่วน/หมวดหมู่ (ช่างผู้รับผิดชอบ · ผู้ดูแลระบบ)' })
  @ApiEnvelope(RepairRequestDetailDto)
  @ApiErrors(400, 403, 404, 409)
  update(
    @CurrentUser() user: CoreHubIdentity,
    @Param('id', UuidParam) id: string,
    @Body() dto: UpdateRepairRequestDto,
  ) {
    return this.requests.update(user, id, dto);
  }

  @Post(':id/cancel')
  @RequirePermissions(Permission.REPAIR_REQUEST_CANCEL_OWN)
  @ApiOperation({ summary: 'ผู้แจ้งยกเลิกใบแจ้งซ่อม (ก่อนช่างเริ่มงาน)' })
  @ApiEnvelope(RepairRequestDetailDto, { status: 201 })
  @ApiErrors(400, 403, 404, 409)
  cancel(
    @CurrentUser() user: CoreHubIdentity,
    @Param('id', UuidParam) id: string,
    @Body() dto: CancelRepairRequestDto,
  ) {
    return this.requests.cancel(user, id, dto);
  }

  @Post(':id/accept')
  @RequirePermissions(Permission.REPAIR_JOB_ACCEPT)
  @ApiOperation({ summary: 'ช่างรับงานที่ยังไม่มีผู้รับผิดชอบ' })
  @ApiEnvelope(RepairRequestDetailDto, { status: 201 })
  @ApiErrors(400, 403, 404, 409)
  accept(@CurrentUser() user: CoreHubIdentity, @Param('id', UuidParam) id: string) {
    return this.requests.accept(user, id);
  }

  @Post(':id/assign')
  @RequirePermissions(Permission.REPAIR_JOB_ASSIGN)
  @ApiOperation({ summary: 'ผู้ดูแลระบบมอบหมาย/โอนงานให้ช่าง' })
  @ApiEnvelope(RepairRequestDetailDto, { status: 201 })
  @ApiErrors(400, 403, 404, 409)
  assign(
    @CurrentUser() user: CoreHubIdentity,
    @Param('id', UuidParam) id: string,
    @Body() dto: AssignRepairRequestDto,
  ) {
    return this.requests.assign(user, id, dto);
  }

  @Post(':id/status')
  @RequirePermissions(
    Permission.REPAIR_JOB_UPDATE_OWN,
    Permission.REPAIR_JOB_UPDATE_ANY,
    Permission.REPAIR_JOB_ACCEPT,
  )
  @UseInterceptors(photos())
  @ApiOperation({ summary: 'เริ่ม / พัก / ปิด / ปฏิเสธงาน (แนบรูปหลังซ่อมในช่อง photos ได้)' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @multipartBody(ChangeStatusDto)
  @ApiEnvelope(RepairRequestDetailDto, { status: 201 })
  @ApiErrors(400, 403, 404, 409)
  changeStatus(
    @CurrentUser() user: CoreHubIdentity,
    @Param('id', UuidParam) id: string,
    @Body() dto: ChangeStatusDto,
    @UploadedFiles() files: Express.Multer.File[] = [],
  ) {
    return this.requests.changeStatus(user, id, dto, files);
  }

  @Post(':id/rating')
  @RequirePermissions(Permission.REPAIR_REQUEST_RATE_OWN)
  @ApiOperation({ summary: 'ผู้แจ้งให้คะแนนความพึงพอใจหลังซ่อมเสร็จ (ครั้งเดียว)' })
  @ApiEnvelope(RepairRequestDetailDto, { status: 201 })
  @ApiErrors(400, 403, 404, 409)
  rate(
    @CurrentUser() user: CoreHubIdentity,
    @Param('id', UuidParam) id: string,
    @Body() dto: RateRepairRequestDto,
  ) {
    return this.requests.rate(user, id, dto);
  }

  @Post(':id/comments')
  @RequirePermissions(Permission.REPAIR_REQUEST_COMMENT_OWN, Permission.REPAIR_REQUEST_COMMENT_ANY)
  @ApiOperation({ summary: 'แสดงความคิดเห็น/สอบถามในใบแจ้งซ่อม' })
  @ApiEnvelope(RequestActivityDto, { status: 201 })
  @ApiErrors(400, 403, 404, 409)
  comment(
    @CurrentUser() user: CoreHubIdentity,
    @Param('id', UuidParam) id: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.requests.comment(user, id, dto);
  }
}
