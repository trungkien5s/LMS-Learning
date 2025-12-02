// ---------- CREATE QUIZ DTO ----------
// src/modules/quizzes/dto/create-quiz.dto.ts
import {
  IsString,
  IsNumber,
  IsOptional,
  Min,
  MinLength,
  IsBoolean,
  IsEnum,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { QuizAttemptStatus } from '../entities/quiz-attempt.entity';

export class CreateQuizDto {
  @IsString()
  @MinLength(3)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  time_limit_minutes?: number;

  @IsOptional()
  @IsBoolean()
  is_published?: boolean = false;

  // ⚠️ lesson_id truyền qua URL: POST /lessons/:lessonId/quizzes
}