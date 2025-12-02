import { Type } from "class-transformer";
import { IsBoolean, IsNumber, IsOptional, IsString, IsUUID, Min } from "class-validator";

// src/modules/quizzes/dto/query-quizzes.dto.ts
export class QueryQuizzesDto {
  @IsOptional()
  @IsString()
  @IsUUID('4')
  lesson_id?: string;

  @IsOptional()
  @IsBoolean()
  is_published?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;
}