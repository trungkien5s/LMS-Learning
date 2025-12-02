// src/modules/courses/dto/create-course.dto.ts
import {
  IsString,
  IsEnum,
  IsNumber,
  Min,
  IsOptional,
  MinLength,
  MaxLength,
} from 'class-validator';
import { CourseLevel } from '../entities/course.entity';

export class CreateCourseDto {
  @IsString()
  @MinLength(5, { message: 'Tiêu đề phải có ít nhất 5 ký tự' })
  @MaxLength(255)
  title: string;

  @IsString()
  @MinLength(10, { message: 'Mô tả phải có ít nhất 10 ký tự' })
  description: string;

  @IsEnum(CourseLevel, { message: 'Level không hợp lệ' })
  level: CourseLevel;

  @IsNumber()
  @Min(0, { message: 'Giá không thể âm' })
  price: number;

  @IsOptional()
  @IsString()
  thumbnail_url?: string;

  // ⚠️ teacher_id lấy từ JWT token, không cho user tự chọn
  // ⚠️ slug tự động generate từ title
  // ⚠️ status mặc định = DRAFT
}
