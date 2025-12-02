import { NotificationType } from "../entities/notification.entity";

// ---------- NOTIFICATION STATS DTO ----------
export class NotificationStatsDto {
  total: number;
  unread: number;
  by_type: {
    [key in NotificationType]?: number;
  };
}