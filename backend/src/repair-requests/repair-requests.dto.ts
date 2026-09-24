import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { ActivityType, ImageKind, Priority, RequestStatus } from '../../generated/prisma/enums';
import { PaginationQueryDto } from '../common/pagination.dto';
import { toInt, trim, trimToUndefined } from '../common/transforms';
import { SLA_STATES, type SlaState } from './sla';
import { REQUEST_ACTIONS, STATUS_TARGETS, type RequestAction, type StatusTarget } from './workflow';

const PRIORITIES = Object.values(Priority);
const STATUSES = Object.values(RequestStatus);

// ------------------------------------------------------------------ input --

/** POST /repair-requests — รับได้ทั้ง application/json และ multipart/form-data (แนบรูปในช่อง photos) */
export class CreateRepairRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4', { message: 'กรุณาเลือกอาคาร' })
  buildingId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID('4', { message: 'กรุณาเลือกหมวดหมู่งานซ่อม' })
  categoryId: string;

  @ApiPropertyOptional({ minimum: -5, maximum: 99, description: '0 = ชั้น G · ติดลบ = ชั้นใต้ดิน' })
  @IsOptional()
  @Transform(toInt)
  @IsInt({ message: 'ชั้นต้องเป็นจำนวนเต็ม' })
  @Min(-5, { message: 'ชั้นต้องอยู่ระหว่าง B5 ถึง 99' })
  @Max(99, { message: 'ชั้นต้องอยู่ระหว่าง B5 ถึง 99' })
  floor?: number;

  @ApiProperty({ minLength: 2, maxLength: 150, example: 'ห้องปฏิบัติการคอมพิวเตอร์ 1 (CS-201)' })
  @Transform(trim)
  @IsString({ message: 'สถานที่ต้องเป็นข้อความ' })
  @Length(2, 150, { message: 'สถานที่ต้องยาว 2–150 ตัวอักษร' })
  location: string;

  @ApiProperty({ minLength: 2, maxLength: 150, example: 'เครื่องปรับอากาศ' })
  @Transform(trim)
  @IsString({ message: 'สิ่งที่ชำรุดต้องเป็นข้อความ' })
  @Length(2, 150, { message: 'สิ่งที่ชำรุดต้องยาว 2–150 ตัวอักษร' })
  equipment: string;

  @ApiPropertyOptional({ maxLength: 50, example: '7440-001-0001/65' })
  @IsOptional()
  @Transform(trimToUndefined)
  @IsString({ message: 'เลขครุภัณฑ์ต้องเป็นข้อความ' })
  @MaxLength(50, { message: 'เลขครุภัณฑ์ยาวได้ไม่เกิน 50 ตัวอักษร' })
  assetNumber?: string;

  @ApiProperty({ minLength: 5, maxLength: 2000, example: 'เปิดแล้วมีแต่ลม ไม่เย็น มีน้ำหยดที่ตัวเครื่อง' })
  @Transform(trim)
  @IsString({ message: 'รายละเอียดต้องเป็นข้อความ' })
  @Length(5, 2000, { message: 'รายละเอียดต้องยาว 5–2000 ตัวอักษร' })
  description: string;

  @ApiPropertyOptional({ enum: PRIORITIES, enumName: 'Priority', default: 'MEDIUM' })
  @IsOptional()
  @IsIn(PRIORITIES, { message: 'ระดับความเร่งด่วนไม่ถูกต้อง' })
  priority?: Priority;

  @ApiPropertyOptional({ format: 'uuid', description: 'แจ้งจากการสแกนสติกเกอร์ QR' })
  @IsOptional()
  @Transform(trimToUndefined)
  @IsUUID('4', { message: 'รหัส QR ไม่ถูกต้อง' })
  qrTagId?: string;
}

export const REQUEST_SCOPES = ['mine', 'assigned', 'all'] as const;
export const REQUEST_STATES = ['open', 'closed', 'overdue'] as const;
export const REQUEST_SORTS = ['newest', 'oldest', 'due', 'priority', 'updated'] as const;
const DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export class ListRepairRequestsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: REQUEST_SCOPES,
    default: 'mine',
    description: 'mine = ที่ฉันแจ้ง · assigned = งานที่ฉันรับผิดชอบ · all = ทั้งหมด (ช่าง/ผู้ดูแล)',
  })
  @IsOptional()
  @IsIn(REQUEST_SCOPES, { message: 'scope ต้องเป็น mine, assigned หรือ all' })
  scope: (typeof REQUEST_SCOPES)[number] = 'mine';

  @ApiPropertyOptional({ enum: STATUSES, enumName: 'RequestStatus' })
  @IsOptional()
  @IsIn(STATUSES, { message: 'สถานะไม่ถูกต้อง' })
  status?: RequestStatus;

  @ApiPropertyOptional({ enum: REQUEST_STATES, description: 'open = ยังไม่ปิดงาน · overdue = เกินกำหนด SLA' })
  @IsOptional()
  @IsIn(REQUEST_STATES, { message: 'state ต้องเป็น open, closed หรือ overdue' })
  state?: (typeof REQUEST_STATES)[number];

  @ApiPropertyOptional({ enum: PRIORITIES, enumName: 'Priority' })
  @IsOptional()
  @IsIn(PRIORITIES, { message: 'ระดับความเร่งด่วนไม่ถูกต้อง' })
  priority?: Priority;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4', { message: 'buildingId ไม่ถูกต้อง' })
  buildingId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4', { message: 'categoryId ไม่ถูกต้อง' })
  categoryId?: string;

  @ApiPropertyOptional({ maxLength: 64, description: 'กรองตามช่างผู้รับผิดชอบ (ใช้กับ scope=all)' })
  @IsOptional()
  @IsString()
  @MaxLength(64, { message: 'assigneeCoreUserId ยาวเกินไป' })
  assigneeCoreUserId?: string;

  @ApiPropertyOptional({
    maxLength: 100,
    description: 'ค้นจากเลขที่ สิ่งที่ชำรุด สถานที่ รายละเอียด หรือเลขครุภัณฑ์',
  })
  @IsOptional()
  @Transform(trimToUndefined)
  @IsString()
  @MaxLength(100, { message: 'คำค้นยาวได้ไม่เกิน 100 ตัวอักษร' })
  q?: string;

  @ApiPropertyOptional({ example: '2026-09-01', description: 'วันที่แจ้งตั้งแต่ (YYYY-MM-DD เวลาไทย)' })
  @IsOptional()
  @Matches(DATE_PATTERN, { message: 'from ต้องเป็นวันที่รูปแบบ YYYY-MM-DD' })
  from?: string;

  @ApiPropertyOptional({
    example: '2026-09-30',
    description: 'วันที่แจ้งถึง (YYYY-MM-DD เวลาไทย รวมวันนั้น)',
  })
  @IsOptional()
  @Matches(DATE_PATTERN, { message: 'to ต้องเป็นวันที่รูปแบบ YYYY-MM-DD' })
  to?: string;

  @ApiPropertyOptional({ enum: REQUEST_SORTS, default: 'newest', description: 'due = ใกล้ครบกำหนดก่อน' })
  @IsOptional()
  @IsIn(REQUEST_SORTS, { message: 'sort ไม่ถูกต้อง' })
  sort: (typeof REQUEST_SORTS)[number] = 'newest';
}

export class UpdateRepairRequestDto {
  @ApiPropertyOptional({
    enum: PRIORITIES,
    enumName: 'Priority',
    description: 'เปลี่ยนแล้วคำนวณกำหนดเสร็จใหม่',
  })
  @IsOptional()
  @IsIn(PRIORITIES, { message: 'ระดับความเร่งด่วนไม่ถูกต้อง' })
  priority?: Priority;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4', { message: 'categoryId ไม่ถูกต้อง' })
  categoryId?: string;
}

export class CancelRepairRequestDto {
  @ApiPropertyOptional({ maxLength: 500, example: 'แจ้งผิดห้อง' })
  @IsOptional()
  @Transform(trimToUndefined)
  @IsString()
  @MaxLength(500, { message: 'เหตุผลยาวได้ไม่เกิน 500 ตัวอักษร' })
  reason?: string;
}

export class AssignRepairRequestDto {
  @ApiProperty({ example: 'user-005', description: 'core_user_id ของช่างที่จะมอบหมาย' })
  @Transform(trim)
  @IsString({ message: 'กรุณาเลือกช่าง' })
  @Length(1, 64, { message: 'กรุณาเลือกช่าง' })
  assigneeCoreUserId: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @Transform(trimToUndefined)
  @IsString()
  @MaxLength(500, { message: 'หมายเหตุยาวได้ไม่เกิน 500 ตัวอักษร' })
  note?: string;
}

/** POST /repair-requests/:id/status — รับ multipart ได้เพื่อแนบรูปหลังซ่อม (ช่อง photos) */
export class ChangeStatusDto {
  @ApiProperty({ enum: STATUS_TARGETS, enumName: 'StatusTarget' })
  @IsIn(STATUS_TARGETS, { message: 'สถานะปลายทางต้องเป็น IN_PROGRESS, ON_HOLD, COMPLETED หรือ REJECTED' })
  status: StatusTarget;

  @ApiPropertyOptional({ maxLength: 2000, description: 'บังคับเมื่อพักงาน (ON_HOLD) หรือปฏิเสธ (REJECTED)' })
  @Transform(trimToUndefined)
  @ValidateIf(
    (dto: ChangeStatusDto) => dto.status === 'ON_HOLD' || dto.status === 'REJECTED' || dto.note !== undefined,
  )
  @IsNotEmpty({ message: 'กรุณาระบุเหตุผล เช่น รออะไหล่ หรือเหตุที่ดำเนินการไม่ได้' })
  @IsString()
  @MaxLength(2000, { message: 'หมายเหตุยาวได้ไม่เกิน 2000 ตัวอักษร' })
  note?: string;
}

export class RateRepairRequestDto {
  @ApiProperty({ minimum: 1, maximum: 5 })
  @Transform(toInt)
  @IsInt({ message: 'คะแนนต้องเป็นจำนวนเต็ม 1–5' })
  @Min(1, { message: 'คะแนนต้องอยู่ระหว่าง 1–5' })
  @Max(5, { message: 'คะแนนต้องอยู่ระหว่าง 1–5' })
  rating: number;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @Transform(trimToUndefined)
  @IsString()
  @MaxLength(500, { message: 'ความคิดเห็นยาวได้ไม่เกิน 500 ตัวอักษร' })
  feedback?: string;
}

export class CreateCommentDto {
  @ApiProperty({ minLength: 1, maxLength: 2000 })
  @Transform(trim)
  @IsString({ message: 'ข้อความต้องเป็นข้อความ' })
  @Length(1, 2000, { message: 'ข้อความต้องยาว 1–2000 ตัวอักษร' })
  message: string;
}

// ----------------------------------------------------------------- output --

export class BuildingRefDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() name: string;
  @ApiProperty({ type: String, nullable: true }) code: string | null;
}

export class CategoryRefDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() name: string;
}

export class PersonDto {
  @ApiProperty({ example: 'user-005' }) coreUserId: string;
  @ApiProperty({ example: 'สมชาย ใจดี' }) displayName: string;
  @ApiProperty() email: string;
  @ApiProperty({ type: String, nullable: true }) phone: string | null;
  @ApiProperty({ type: String, nullable: true }) workUnit: string | null;
}

export class SlaDto {
  @ApiProperty({ enum: SLA_STATES, enumName: 'SlaState' }) state: SlaState;
  @ApiProperty({ format: 'date-time' }) dueAt: string;
  @ApiProperty({ description: 'เป้าหมายตามระดับความเร่งด่วน (ชั่วโมง)' }) targetHours: number;
  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'นาทีที่เหลือ (ติดลบ = เกินมาแล้ว) · null เมื่อปิดงาน',
  })
  minutesLeft: number | null;
}

export class QrTagRefDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ example: 'K7QM4TZP' }) code: string;
}

export class RepairImageDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ enum: Object.values(ImageKind), enumName: 'ImageKind' }) kind: ImageKind;
  @ApiProperty({ example: 'image/jpeg' }) mimeType: string;
  @ApiProperty() size: number;
  @ApiProperty({ example: '/api/v1/repair-images/…/file' }) url: string;
  @ApiProperty({ type: () => PersonDto }) uploadedBy: PersonDto;
  @ApiProperty({ format: 'date-time' }) createdAt: string;
}

export class RequestActivityDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ enum: Object.values(ActivityType), enumName: 'ActivityType' }) type: ActivityType;
  @ApiProperty({ enum: STATUSES, enumName: 'RequestStatus', nullable: true })
  fromStatus: RequestStatus | null;
  @ApiProperty({ enum: STATUSES, enumName: 'RequestStatus', nullable: true }) toStatus: RequestStatus | null;
  @ApiProperty({ type: String, nullable: true }) message: string | null;
  @ApiProperty({ type: () => PersonDto }) actor: PersonDto;
  @ApiProperty({ format: 'date-time' }) createdAt: string;
}

export class RepairRequestSummaryDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ example: 'RP-6909-0012' }) code: string;
  @ApiProperty() equipment: string;
  @ApiProperty() location: string;
  @ApiProperty({ type: Number, nullable: true }) floor: number | null;
  @ApiProperty({ type: () => BuildingRefDto }) building: BuildingRefDto;
  @ApiProperty({ type: () => CategoryRefDto }) category: CategoryRefDto;
  @ApiProperty({ enum: PRIORITIES, enumName: 'Priority' }) priority: Priority;
  @ApiProperty({ enum: STATUSES, enumName: 'RequestStatus' }) status: RequestStatus;
  @ApiProperty({ type: () => PersonDto }) reporter: PersonDto;
  @ApiProperty({ type: () => PersonDto, nullable: true }) assignee: PersonDto | null;
  @ApiProperty({ type: () => SlaDto }) sla: SlaDto;
  @ApiProperty({ type: Number, nullable: true, minimum: 1, maximum: 5 }) rating: number | null;
  @ApiProperty() imageCount: number;
  @ApiProperty({ type: String, nullable: true, description: 'รูปแรกของผู้แจ้ง (ใช้เป็นภาพย่อ)' })
  coverImageUrl: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt: string;
  @ApiProperty({ format: 'date-time' }) updatedAt: string;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) acceptedAt: string | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) completedAt: string | null;
}

export class RepairRequestDetailDto extends RepairRequestSummaryDto {
  @ApiProperty() description: string;
  @ApiProperty({ type: String, nullable: true }) assetNumber: string | null;
  @ApiProperty({ type: String, nullable: true }) feedback: string | null;
  @ApiProperty({ type: () => QrTagRefDto, nullable: true }) qrTag: QrTagRefDto | null;
  @ApiProperty({ type: () => [RepairImageDto] }) images: RepairImageDto[];
  @ApiProperty({ type: () => [RequestActivityDto] }) activities: RequestActivityDto[];
  @ApiProperty({
    enum: REQUEST_ACTIONS,
    enumName: 'RequestAction',
    isArray: true,
    description: 'สิ่งที่ผู้เรียกทำกับใบนี้ได้ตอนนี้ (ใช้แสดงปุ่ม)',
  })
  allowedActions: RequestAction[];
}
