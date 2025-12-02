import { IsBoolean, IsNumber, IsOptional, IsString, Min, MinLength } from "class-validator";

// src/modules/quizzes/dto/update-quiz.dto.ts
export class UpdateQuizDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  time_limit_minutes?: number;

  @IsOptional()
  @IsBoolean()
  is_published?: boolean;
}