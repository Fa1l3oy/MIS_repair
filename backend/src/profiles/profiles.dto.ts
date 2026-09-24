import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { PaginationQueryDto } from '../common/pagination.dto';
import { trim } from '../common/transforms';
import { SUBSYSTEM_ROLES, type SubsystemRole } from '../auth/role-mapping';

/** "081-234-5678" / "+66 81 234 5678" → "0812345678" (data-dictionary.md ข้อ 6: Phone no-hyphen) */
const normalizePhone = ({ value }: { value: unknown }) =>
  typeof value === 'string'
    ? value
        .trim()
        .replace(/^\+66/, '0')
        .replace(/[\s().-]/g, '')
    : value;

export class UpdateMyProfileDto {
  @ApiPropertyOptional({ maxLength: 100, description: 'ส่ง "" เพื่อล้างค่า' })
  @IsOptional()
  @Transform(trim)
  @IsString({ message: 'ชื่อที่แสดงต้องเป็นข้อความ' })
  @ValidateIf((_, value) => value !== '')
  @MinLength(2, { message: 'ชื่อที่แสดงต้องมีอย่างน้อย 2 ตัวอักษร' })
  @MaxLength(100, { message: 'ชื่อที่แสดงยาวได้ไม่เกิน 100 ตัวอักษร' })
  displayName?: string;

  @ApiPropertyOptional({
    description: 'ตัวเลข 9–10 หลักขึ้นต้นด้วย 0 · ส่ง "" เพื่อล้างค่า',
    example: '0812345678',
  })
  @IsOptional()
  @Transform(normalizePhone)
  @IsString({ message: 'เบอร์โทรต้องเป็นข้อความ' })
  @ValidateIf((_, value) => value !== '')
  @Matches(/^0\d{8,9}$/, { message: 'เบอร์โทรต้องเป็นตัวเลข 9–10 หลักขึ้นต้นด้วย 0 เช่น 081-234-5678' })
  phone?: string;

  @ApiPropertyOptional({ maxLength: 100, description: 'ห้อง/หน่วยงานที่ติดต่อได้ · ส่ง "" เพื่อล้างค่า' })
  @IsOptional()
  @Transform(trim)
  @IsString({ message: 'หน่วยงานต้องเป็นข้อความ' })
  @ValidateIf((_, value) => value !== '')
  @MinLength(2, { message: 'หน่วยงานต้องมีอย่างน้อย 2 ตัวอักษร' })
  @MaxLength(100, { message: 'หน่วยงานยาวได้ไม่เกิน 100 ตัวอักษร' })
  workUnit?: string;
}

export class ListProfilesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ maxLength: 100, description: 'ค้นจากชื่อ อีเมล หรือหน่วยงาน' })
  @IsOptional()
  @Transform(trim)
  @IsString({ message: 'คำค้นต้องเป็นข้อความ' })
  @MaxLength(100, { message: 'คำค้นยาวได้ไม่เกิน 100 ตัวอักษร' })
  q?: string;

  @ApiPropertyOptional({ enum: SUBSYSTEM_ROLES })
  @IsOptional()
  @IsIn(SUBSYSTEM_ROLES, { message: `role ต้องเป็นหนึ่งใน ${SUBSYSTEM_ROLES.join(', ')}` })
  role?: SubsystemRole;
}

export class UpdateProfileDto {
  @ApiProperty({ description: 'แต่งตั้ง/ถอดถอนช่างซ่อมบำรุง (เฉพาะผู้ใช้ core role staff)' })
  @IsBoolean({ message: 'isTechnician ต้องเป็น true หรือ false' })
  isTechnician: boolean;
}
