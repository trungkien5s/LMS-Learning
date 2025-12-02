import { IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from "class-validator";
import { LessonType } from "../entities/lesson.entity";

// src/modules/lessons/dto/create-lesson.dto.ts
export class CreateLessonDto {
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  title: string;

  @IsEnum(LessonType)
  type: LessonType;

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
  order_index?: number; // Nếu không truyền, tự động lấy max + 1

  @IsOptional()
  is_preview?: boolean = false;

  // ⚠️ course_id truyền qua URL param: POST /courses/:courseId/lessons
}