import { IsEnum, IsNumber, IsOptional, Min } from "class-validator";
import { NotificationType } from "../entities/notification.entity";
import { Type } from "class-transformer";

// ---------- QUERY NOTIFICATIONS DTO ----------
export class QueryNotificationsDto {
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @IsOptional()
  is_read?: boolean; // true = đã đọc, false = chưa đọc

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;
}
