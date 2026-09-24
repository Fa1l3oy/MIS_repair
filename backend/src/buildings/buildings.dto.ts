import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, Length, Matches, MaxLength, ValidateIf } from 'class-validator';
import { PaginationQueryDto } from '../common/pagination.dto';
import { toBoolean, trim } from '../common/transforms';

const upperTrim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export class BuildingDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ example: 'อาคารเฉลิมพระเกียรติ' }) name: string;
  @ApiProperty({ type: String, nullable: true, example: 'CS1', description: 'รหัสย่อบนป้าย/เอกสาร' })
  code: string | null;
  @ApiProperty({ description: 'false = ไม่แสดงในฟอร์มแจ้งซ่อม แต่ข้อมูลเดิมยังอ้างถึงได้' })
  isActive: boolean;
  @ApiProperty({ description: 'จำนวนใบแจ้งซ่อมที่อ้างถึงอาคารนี้' }) requestCount: number;
  @ApiProperty({ description: 'จำนวนสติกเกอร์ QR ของอาคารนี้' }) qrTagCount: number;
  @ApiProperty({ format: 'date-time' }) createdAt: string;
  @ApiProperty({ format: 'date-time' }) updatedAt: string;
}

export class ListBuildingsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ maxLength: 100, description: 'ค้นจากชื่อหรือรหัส' })
  @IsOptional()
  @Transform(trim)
  @IsString({ message: 'คำค้นต้องเป็นข้อความ' })
  @MaxLength(100, { message: 'คำค้นยาวได้ไม่เกิน 100 ตัวอักษร' })
  q?: string;

  @ApiPropertyOptional({ description: 'true = เฉพาะที่เปิดใช้งาน (ใช้ในฟอร์มแจ้งซ่อม)' })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean({ message: 'isActive ต้องเป็น true หรือ false' })
  isActive?: boolean;
}

export class CreateBuildingDto {
  @ApiProperty({ minLength: 2, maxLength: 100, example: 'อาคารเฉลิมพระเกียรติ' })
  @Transform(trim)
  @IsString({ message: 'ชื่ออาคารต้องเป็นข้อความ' })
  @Length(2, 100, { message: 'ชื่ออาคารต้องยาว 2–100 ตัวอักษร' })
  name: string;

  @ApiPropertyOptional({ maxLength: 10, example: 'CS1', description: 'A–Z ตัวเลข และ - เท่านั้น' })
  @IsOptional()
  @Transform(upperTrim)
  @IsString({ message: 'รหัสอาคารต้องเป็นข้อความ' })
  @Matches(/^[A-Z0-9-]{1,10}$/, { message: 'รหัสอาคารใช้ได้เฉพาะ A–Z ตัวเลข และ - ไม่เกิน 10 ตัว' })
  code?: string;
}

export class UpdateBuildingDto {
  @ApiPropertyOptional({ minLength: 2, maxLength: 100 })
  @IsOptional()
  @Transform(trim)
  @IsString({ message: 'ชื่ออาคารต้องเป็นข้อความ' })
  @Length(2, 100, { message: 'ชื่ออาคารต้องยาว 2–100 ตัวอักษร' })
  name?: string;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 10, description: 'null = ล้างรหัส' })
  @IsOptional()
  @Transform(upperTrim)
  @ValidateIf((_, value) => value !== null)
  @IsString({ message: 'รหัสอาคารต้องเป็นข้อความ' })
  @Matches(/^[A-Z0-9-]{1,10}$/, { message: 'รหัสอาคารใช้ได้เฉพาะ A–Z ตัวเลข และ - ไม่เกิน 10 ตัว' })
  code?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean({ message: 'isActive ต้องเป็น true หรือ false' })
  isActive?: boolean;
}
