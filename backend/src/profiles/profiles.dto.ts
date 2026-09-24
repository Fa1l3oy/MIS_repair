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

const CORE_ROLE_VALUES = ['student', 'alumni', 'staff', 'admin'];

/** ผู้ใช้ที่เคยเข้าระบบนี้ (มุมมองของผู้ดูแลระบบ) */
export class ProfileDto {
  @ApiProperty({ format: 'uuid', description: 'id ของโปรไฟล์ในระบบนี้ (ใช้กับ PATCH /profiles/:id)' })
  id: string;
  @ApiProperty({ example: 'user-003', description: 'claim `sub` จาก Core Hub' }) coreUserId: string;
  @ApiProperty({ example: 'staff@core.local' }) email: string;
  @ApiProperty({ enum: CORE_ROLE_VALUES }) coreRole: string;
  @ApiProperty({
    enum: SUBSYSTEM_ROLES,
    nullable: true,
    description: 'null = core role นี้เข้าระบบไม่ได้แล้ว',
  })
  subsystemRole: SubsystemRole | null;
  @ApiProperty() isTechnician: boolean;
  @ApiProperty({ example: 'สมชาย ใจดี' }) displayName: string;
  @ApiProperty({ type: String, nullable: true, example: '0812345678' }) phone: string | null;
  @ApiProperty({ type: String, nullable: true, example: 'งานอาคารสถานที่' }) workUnit: string | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) lastSeenAt: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt: string;
  @ApiProperty({ format: 'date-time' }) updatedAt: string;
}

/** ตัวตนของผู้เรียก — GET /api/v1/me */
export class MeDto {
  @ApiProperty({ example: 'user-003', description: 'เท่ากับ claim `sub` ของ token' }) id: string;
  @ApiProperty({ example: 'staff@core.local' }) email: string;
  @ApiProperty({ enum: CORE_ROLE_VALUES, description: 'เท่ากับ claim `role` ของ token' }) coreRole: string;
  @ApiProperty({ enum: SUBSYSTEM_ROLES }) subsystemRole: SubsystemRole;
  @ApiProperty({ type: [String], example: ['repair-request:create', 'repair-request:read:own'] })
  permissions: string[];
  @ApiProperty({ example: 'สมชาย ใจดี', description: 'ถ้ายังไม่ตั้งชื่อ จะใช้ส่วนหน้าของอีเมล' })
  displayName: string;
  @ApiProperty({ description: 'false = ยังไม่ได้ตั้งชื่อที่แสดง (ควรชวนผู้ใช้กรอกโปรไฟล์)' })
  hasDisplayName: boolean;
  @ApiProperty({ type: String, nullable: true }) phone: string | null;
  @ApiProperty({ type: String, nullable: true }) workUnit: string | null;
  @ApiProperty({
    format: 'date-time',
    description: 'token หมดอายุเมื่อไร — ต้องเข้าผ่าน Core Hub ใหม่หลังจากนี้',
  })
  sessionExpiresAt: string;
}
