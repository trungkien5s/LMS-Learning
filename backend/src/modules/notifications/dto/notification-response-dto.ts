import { NotificationType } from "../entities/notification.entity";

// ---------- NOTIFICATION RESPONSE DTO ----------
export class NotificationResponseDto {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  read_at: Date | null;
  created_at: Date;

  // Link to related entity
  related?: {
    id: string;
    type: string;
    url: string; // Frontend URL to navigate
  };
}