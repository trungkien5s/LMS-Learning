// src/modules/notifications/notifications.service.ts
import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Notification, NotificationType } from './entities/notification.entity';

import { NotificationStatsDto } from './dto/notification-stats.dto';
import { UserRole } from '@/modules/users/entities/user.entity';
import { CreateNotificationDto } from './dto/create-notification-dto';
import { QueryNotificationsDto } from './dto/query-nofication-dto';
import { NotificationResponseDto } from './dto/notification-response-dto';
import { MarkAsReadDto } from './dto/marksasread-dto';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  // ======================================================
  // INTERNAL / ADMIN CREATE
  // ======================================================

  // Dùng cho admin hoặc service nội bộ tạo thông báo
  async createNotification(
    dto: CreateNotificationDto,
  ): Promise<Notification> {
    const notification = this.notificationRepository.create({
      user_id: dto.user_id,
      type: dto.type,
      title: dto.title,
      body: dto.body,
      related_id: dto.related_id ?? null,
      related_type: dto.related_type ?? null,
    });

    return this.notificationRepository.save(notification);
  }

  // Helper: tạo notification cho 1 user (cho các module khác gọi)
  async createForUser(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    related?: { id?: string; type?: string },
  ): Promise<Notification> {
    const notification = this.notificationRepository.create({
      user_id: userId,
      type,
      title,
      body,
      related_id: related?.id ?? null,
      related_type: related?.type ?? null,
    });
    return this.notificationRepository.save(notification);
  }

  // ======================================================
  // LIST NOTIFICATIONS CỦA CURRENT USER
  // ======================================================

  async getNotificationsForUser(
    userId: string,
    query: QueryNotificationsDto,
  ): Promise<PaginatedResult<NotificationResponseDto>> {
    const qb = this.notificationRepository
      .createQueryBuilder('n')
      .where('n.user_id = :userId', { userId });

    if (query.type) {
      qb.andWhere('n.type = :type', { type: query.type });
    }

    if (query.is_read !== undefined) {
      if (query.is_read === true) {
        qb.andWhere('n.read_at IS NOT NULL');
      } else {
        qb.andWhere('n.read_at IS NULL');
      }
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    qb.orderBy('n.created_at', 'DESC');

    const [rows, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const data = rows.map((n) => this.toNotificationResponseDto(n));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ======================================================
  // STATS: total, unread, by_type
  // ======================================================

  async getStatsForUser(userId: string): Promise<NotificationStatsDto> {
    const all = await this.notificationRepository.find({
      where: { user_id: userId },
    });

    const total = all.length;
    const unread = all.filter((n) => !n.read_at).length;

    const by_type: NotificationStatsDto['by_type'] = {};
    all.forEach((n) => {
      const type = n.type;
      if (!by_type[type]) {
        by_type[type] = 0;
      }
      by_type[type]! += 1;
    });

    return {
      total,
      unread,
      by_type,
    };
  }

  // ======================================================
  // MARK AS READ
  // ======================================================

  async markAsRead(
    userId: string,
    dto: MarkAsReadDto,
  ): Promise<{ message: string; affected: number }> {
    const now = new Date();

    if (dto.notification_ids && dto.notification_ids.length > 0) {
      // Mark một list ID
      const result = await this.notificationRepository
        .createQueryBuilder()
        .update(Notification)
        .set({ read_at: now })
        .where('user_id = :userId', { userId })
        .andWhere('id IN (:...ids)', { ids: dto.notification_ids })
        .andWhere('read_at IS NULL')
        .execute();

      return {
        message: 'Đã đánh dấu đã đọc các thông báo được chọn',
        affected: result.affected ?? 0,
      };
    } else {
      // Mark all
      const result = await this.notificationRepository
        .createQueryBuilder()
        .update(Notification)
        .set({ read_at: now })
        .where('user_id = :userId', { userId })
        .andWhere('read_at IS NULL')
        .execute();

      return {
        message: 'Đã đánh dấu tất cả thông báo là đã đọc',
        affected: result.affected ?? 0,
      };
    }
  }

  // ======================================================
  // DELETE (optional – chỉ cho chính chủ)
  // ======================================================

  async deleteNotification(
    notificationId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<{ message: string }> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notification không tồn tại');
    }

    const isOwner = notification.user_id === userId;
    const isAdmin = userRole === UserRole.ADMIN;

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException(
        'Bạn không có quyền xóa thông báo này',
      );
    }

    await this.notificationRepository.delete(notificationId);

    return { message: 'Xoá thông báo thành công' };
  }

  // ======================================================
  // MAPPERS
  // ======================================================

  private toNotificationResponseDto(
    n: Notification,
  ): NotificationResponseDto {
    let related: NotificationResponseDto['related'];

    if (n.related_id && n.related_type) {
      const baseUrl =
        process.env.FRONTEND_URL || 'http://localhost:3000';

      // Bạn có thể custom URL này theo FE route thực tế
      const url = `${baseUrl}/${n.related_type}/${n.related_id}`;

      related = {
        id: n.related_id,
        type: n.related_type,
        url,
      };
    }

    return {
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      read_at: n.read_at ?? null,
      created_at: n.created_at,
      related,
    };
  }
}
