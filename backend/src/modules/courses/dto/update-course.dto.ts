import { IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from "class-validator";
import { CourseLevel, CourseStatus } from "../entities/course.entity";

// src/modules/courses/dto/update-course.dto.ts
export class UpdateCourseDto {
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  description?: string;

  @IsOptional()
  @IsEnum(CourseLevel)
  level?: CourseLevel;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  thumbnail_url?: string;

  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus;
}
