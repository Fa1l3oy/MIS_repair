import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../common/pagination.dto';
import { toBoolean, trim } from '../common/transforms';

export class CategoryDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ example: 'ไฟฟ้าและแสงสว่าง' }) name: string;
  @ApiProperty({ description: 'false = ไม่แสดงในฟอร์มแจ้งซ่อม แต่ข้อมูลเดิมยังอ้างถึงได้' })
  isActive: boolean;
  @ApiProperty({ description: 'จำนวนใบแจ้งซ่อมในหมวดนี้' }) requestCount: number;
  @ApiProperty({ format: 'date-time' }) createdAt: string;
  @ApiProperty({ format: 'date-time' }) updatedAt: string;
}

export class ListCategoriesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ maxLength: 100 })
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

export class CreateCategoryDto {
  @ApiProperty({ minLength: 2, maxLength: 100, example: 'ไฟฟ้าและแสงสว่าง' })
  @Transform(trim)
  @IsString({ message: 'ชื่อหมวดหมู่ต้องเป็นข้อความ' })
  @Length(2, 100, { message: 'ชื่อหมวดหมู่ต้องยาว 2–100 ตัวอักษร' })
  name: string;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional({ minLength: 2, maxLength: 100 })
  @IsOptional()
  @Transform(trim)
  @IsString({ message: 'ชื่อหมวดหมู่ต้องเป็นข้อความ' })
  @Length(2, 100, { message: 'ชื่อหมวดหมู่ต้องยาว 2–100 ตัวอักษร' })
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean({ message: 'isActive ต้องเป็น true หรือ false' })
  isActive?: boolean;
}
