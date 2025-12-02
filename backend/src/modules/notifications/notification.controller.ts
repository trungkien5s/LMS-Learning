// src/modules/notifications/notifications.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { NotificationType } from './entities/notification.entity';

import { NotificationStatsDto } from './dto/notification-stats.dto';

import { JwtAuthGuard } from '@/auth/passport/jwt-auth.guard';
import { RolesGuard } from '@/auth/passport/roles.guard';
import { Roles } from '@/decorator/roles.decorator';
import { Public } from '@/decorator/customize';
import { UserRole } from '@/modules/users/entities/user.entity';

import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { NotificationsService, PaginatedResult } from './notification.service';
import { CreateNotificationDto } from './dto/create-notification-dto';
import { NotificationResponseDto } from './dto/notification-response-dto';
import { QueryNotificationsDto } from './dto/query-nofication-dto';
import { MarkAsReadDto } from './dto/marksasread-dto';

interface AuthUser {
  userId: string;
  role: UserRole;
  email: string;
}

interface RequestWithUser extends ExpressRequest {
  user: AuthUser;
}

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
  ) {}

  // ======================================================
  // ADMIN / INTERNAL: CREATE NOTIFICATION
  // ======================================================
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Admin tạo thông báo cho 1 user cụ thể',
  })
  @ApiBody({ type: CreateNotificationDto })
  async createNotification(
    @Body() dto: CreateNotificationDto,
  ): Promise<NotificationResponseDto> {
    const created =
      await this.notificationsService.createNotification(dto);
    // map lại theo response DTO
    return {
      id: created.id,
      type: created.type,
      title: created.title,
      body: created.body,
      read_at: created.read_at,
      created_at: created.created_at,
      related: created.related_id && created.related_type
        ? {
            id: created.related_id,
            type: created.related_type,
            url: `${
              process.env.FRONTEND_URL || 'http://localhost:3000'
            }/${created.related_type}/${created.related_id}`,
          }
        : undefined,
    };
  }

  // ======================================================
  // CURRENT USER: LIST
  // ======================================================
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy danh sách thông báo của current user',
  })
  @ApiQuery({ name: 'type', required: false, enum: Object.values(NotificationType) })
  @ApiQuery({ name: 'is_read', required: false })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  async getMyNotifications(
    @Req() req: RequestWithUser,
    @Query() query: QueryNotificationsDto,
  ): Promise<PaginatedResult<NotificationResponseDto>> {
    const { userId } = req.user;
    return this.notificationsService.getNotificationsForUser(
      userId,
      query,
    );
  }

  // ======================================================
  // CURRENT USER: STATS
  // ======================================================
  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Lấy thống kê thông báo của current user (total, unread, by_type)',
  })
  async getMyStats(
    @Req() req: RequestWithUser,
  ): Promise<NotificationStatsDto> {
    const { userId } = req.user;
    return this.notificationsService.getStatsForUser(userId);
  }

  // ======================================================
  // CURRENT USER: MARK AS READ
  // ======================================================
  @Patch('read')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Đánh dấu đã đọc: truyền list id hoặc để trống = mark all',
  })
  @ApiBody({ type: MarkAsReadDto })
  async markAsRead(
    @Req() req: RequestWithUser,
    @Body() dto: MarkAsReadDto,
  ) {
    const { userId } = req.user;
    return this.notificationsService.markAsRead(userId, dto);
  }

  // ======================================================
  // DELETE NOTIFICATION (OWNER OR ADMIN)
  // ======================================================
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Xoá 1 thông báo (chính chủ hoặc admin)',
  })
  @ApiParam({ name: 'id' })
  async deleteNotification(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    const { userId, role } = req.user;
    return this.notificationsService.deleteNotification(
      id,
      userId,
      role,
    );
  }
}
