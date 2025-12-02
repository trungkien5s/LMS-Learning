import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { NotificationType } from '../entities/notification.entity';

export class CreateNotificationDto {
  @IsString()
  @IsUUID('4')
  user_id: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsString()
  title: string;

  @IsString()
  body: string;

  @IsOptional()
  @IsString()
  related_id?: string;

  @IsOptional()
  @IsString()
  related_type?: string;
}