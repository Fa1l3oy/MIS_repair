import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { ApiEnvelope } from '../common/swagger';
import { APP_CONFIG, type AppConfig } from '../config/configuration';

export class HealthDto {
  @ApiProperty({ enum: ['ok'] }) status: 'ok';
  @ApiProperty({ example: 'csmju-repair', description: 'ต้องตรงกับ name ใน subsystem.yaml' }) service: string;
}

/** GET /api/health — public · data.service ต้องตรงกับ name ใน subsystem.yaml และทะเบียน Core Hub */
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'ตรวจสถานะระบบ (public)' })
  @ApiEnvelope(HealthDto)
  health(): HealthDto {
    return { status: 'ok', service: this.config.subsystemId };
  }
}
