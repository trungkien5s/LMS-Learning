import { IsArray, IsOptional, IsUUID } from "class-validator";

export class MarkAsReadDto {
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  notification_ids?: string[]; // Nếu empty -> mark all as read
}
