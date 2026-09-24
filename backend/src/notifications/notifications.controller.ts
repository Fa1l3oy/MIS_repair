import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { CoreHubIdentity } from '../auth/core-hub-identity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { Permission } from '../auth/permissions';
import { ApiEnvelope, ApiErrors, ApiPageEnvelope } from '../common/swagger';
import { UuidParam } from '../common/uuid.pipe';
import {
  ListNotificationsQueryDto,
  MarkAllNotificationsDto,
  MarkAllResultDto,
  NotificationDto,
  UpdateNotificationDto,
} from './notifications.dto';
import { NotificationsService } from './notifications.service';

/** การแจ้งเตือนในระบบของผู้ใช้แต่ละคน */
@ApiTags('notifications')
@ApiBearerAuth()
@Controller('v1/notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @RequirePermissions(Permission.NOTIFICATION_READ_OWN)
  @ApiOperation({ summary: 'การแจ้งเตือนของฉัน (ใหม่สุดก่อน)' })
  @ApiPageEnvelope(NotificationDto)
  @ApiErrors(400, 403)
  list(@CurrentUser() user: CoreHubIdentity, @Query() query: ListNotificationsQueryDto) {
    return this.notifications.list(user.coreUserId, query);
  }

  @Patch()
  @RequirePermissions(Permission.NOTIFICATION_UPDATE_OWN)
  @ApiOperation({ summary: 'ทำเครื่องหมายว่าอ่านแล้วทั้งหมด' })
  @ApiEnvelope(MarkAllResultDto)
  @ApiErrors(400, 403)
  markAll(@CurrentUser() user: CoreHubIdentity, @Body() _dto: MarkAllNotificationsDto) {
    return this.notifications.markAllRead(user.coreUserId);
  }

  @Patch(':id')
  @RequirePermissions(Permission.NOTIFICATION_UPDATE_OWN)
  @ApiOperation({ summary: 'ทำเครื่องหมายว่าอ่านแล้ว/ยังไม่อ่าน' })
  @ApiEnvelope(NotificationDto)
  @ApiErrors(400, 403, 404)
  update(
    @CurrentUser() user: CoreHubIdentity,
    @Param('id', UuidParam) id: string,
    @Body() dto: UpdateNotificationDto,
  ) {
    return this.notifications.setRead(user.coreUserId, id, dto.isRead);
  }
}
