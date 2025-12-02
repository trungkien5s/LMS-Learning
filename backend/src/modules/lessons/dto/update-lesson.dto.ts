import { IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from "class-validator";
import { LessonType } from "../entities/lesson.entity";

// src/modules/lessons/dto/update-lesson.dto.ts
export class UpdateLessonDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsEnum(LessonType)
  type?: LessonType;

  @IsOptional()
  @IsString()
  video_url?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  duration_seconds?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  order_index?: number;

  @IsOptional()
  is_preview?: boolean;
}