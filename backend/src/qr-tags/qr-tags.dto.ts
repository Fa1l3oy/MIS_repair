import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
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
import { RequestStatus } from '../../generated/prisma/enums';
import { PaginationQueryDto } from '../common/pagination.dto';
import { toInt, trim, trimToUndefined } from '../common/transforms';
import { BuildingRefDto, CategoryRefDto } from '../repair-requests/repair-requests.dto';

/** "k7qm-4tzp" → "K7QM4TZP" (ผู้ใช้พิมพ์เองจากสติกเกอร์ได้) */
const normalizeCode = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.replace(/[\s-]/g, '').toUpperCase() : value;

export class OpenRequestHintDto {
  @ApiProperty({ example: 'RP-6909-0012' }) code: string;
  @ApiProperty() equipment: string;
  @ApiProperty({ enum: Object.values(RequestStatus), enumName: 'RequestStatus' }) status: RequestStatus;
  @ApiProperty({ format: 'date-time' }) createdAt: string;
}

export class QrTagDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ example: 'K7QM4TZP', description: 'รหัส 8 ตัวบนสติกเกอร์ (ไม่มี I O 0 1)' }) code: string;
  @ApiProperty({ type: () => BuildingRefDto }) building: BuildingRefDto;
  @ApiProperty({ type: Number, nullable: true }) floor: number | null;
  @ApiProperty({ example: 'ห้องปฏิบัติการคอมพิวเตอร์ 1 (CS-201)' }) location: string;
  @ApiProperty({ type: String, nullable: true, example: 'เครื่องปรับอากาศ ตัวที่ 2' }) equipment:
    string | null;
  @ApiProperty({ type: String, nullable: true }) assetNumber: string | null;
  @ApiProperty({ type: () => CategoryRefDto, nullable: true }) category: CategoryRefDto | null;
  @ApiProperty({ description: 'จำนวนใบแจ้งซ่อมทั้งหมดที่แจ้งผ่าน QR นี้' }) requestCount: number;
  @ApiProperty({
    type: () => [OpenRequestHintDto],
    description: 'งานที่ยังไม่ปิดของจุดนี้ (ไม่มีข้อมูลผู้แจ้ง) — ใช้เตือนก่อนแจ้งซ้ำ',
  })
  openRequests: OpenRequestHintDto[];
  @ApiProperty({ format: 'date-time' }) createdAt: string;
  @ApiProperty({ format: 'date-time' }) updatedAt: string;
}

export class ListQrTagsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'K7QM4TZP', description: 'ค้นหาด้วยรหัสบนสติกเกอร์ (ใช้ตอนสแกน)' })
  @IsOptional()
  @Transform(normalizeCode)
  @IsString()
  @Matches(/^[A-HJ-NP-Z2-9]{8}$/, { message: 'รหัส QR ต้องเป็นตัวอักษร/ตัวเลข 8 ตัว' })
  code?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4', { message: 'buildingId ไม่ถูกต้อง' })
  buildingId?: string;

  @ApiPropertyOptional({ maxLength: 100, description: 'ค้นจากสถานที่ อุปกรณ์ หรือเลขครุภัณฑ์' })
  @IsOptional()
  @Transform(trimToUndefined)
  @IsString()
  @MaxLength(100, { message: 'คำค้นยาวได้ไม่เกิน 100 ตัวอักษร' })
  q?: string;
}

export class CreateQrTagDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4', { message: 'กรุณาเลือกอาคาร' })
  buildingId: string;

  @ApiPropertyOptional({ minimum: -5, maximum: 99 })
  @IsOptional()
  @Transform(toInt)
  @IsInt({ message: 'ชั้นต้องเป็นจำนวนเต็ม' })
  @Min(-5, { message: 'ชั้นต้องอยู่ระหว่าง B5 ถึง 99' })
  @Max(99, { message: 'ชั้นต้องอยู่ระหว่าง B5 ถึง 99' })
  floor?: number;

  @ApiProperty({ minLength: 2, maxLength: 150 })
  @Transform(trim)
  @IsString({ message: 'สถานที่ต้องเป็นข้อความ' })
  @Length(2, 150, { message: 'สถานที่ต้องยาว 2–150 ตัวอักษร' })
  location: string;

  @ApiPropertyOptional({
    minLength: 2,
    maxLength: 150,
    description: 'เว้นว่าง = สติกเกอร์ของห้อง/จุด ไม่เจาะจงอุปกรณ์',
  })
  @IsOptional()
  @Transform(trimToUndefined)
  @IsString()
  @Length(2, 150, { message: 'ชื่ออุปกรณ์ต้องยาว 2–150 ตัวอักษร' })
  equipment?: string;

  @ApiPropertyOptional({ maxLength: 50 })
  @IsOptional()
  @Transform(trimToUndefined)
  @IsString()
  @MaxLength(50, { message: 'เลขครุภัณฑ์ยาวได้ไม่เกิน 50 ตัวอักษร' })
  assetNumber?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'หมวดหมู่ที่เลือกไว้ให้ในฟอร์ม' })
  @IsOptional()
  @IsUUID('4', { message: 'categoryId ไม่ถูกต้อง' })
  categoryId?: string;
}

export class UpdateQrTagDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4', { message: 'buildingId ไม่ถูกต้อง' })
  buildingId?: string;

  @ApiPropertyOptional({ type: Number, nullable: true, minimum: -5, maximum: 99 })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Transform(toInt)
  @IsInt({ message: 'ชั้นต้องเป็นจำนวนเต็ม' })
  @Min(-5, { message: 'ชั้นต้องอยู่ระหว่าง B5 ถึง 99' })
  @Max(99, { message: 'ชั้นต้องอยู่ระหว่าง B5 ถึง 99' })
  floor?: number | null;

  @ApiPropertyOptional({ minLength: 2, maxLength: 150 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(2, 150, { message: 'สถานที่ต้องยาว 2–150 ตัวอักษร' })
  location?: string;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 150 })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Transform(trim)
  @IsString()
  @Length(2, 150, { message: 'ชื่ออุปกรณ์ต้องยาว 2–150 ตัวอักษร' })
  equipment?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 50 })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Transform(trim)
  @IsString()
  @Length(1, 50, { message: 'เลขครุภัณฑ์ยาวได้ไม่เกิน 50 ตัวอักษร' })
  assetNumber?: string | null;

  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID('4', { message: 'categoryId ไม่ถูกต้อง' })
  categoryId?: string | null;
}
