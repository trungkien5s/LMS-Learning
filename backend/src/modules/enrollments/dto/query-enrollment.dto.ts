// src/modules/enrollments/dto/query-enrollment.dto.ts
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { IsNumber, Min } from 'class-validator';
import { EnrollmentStatus } from './update-enrollment.dto';

export class QueryEnrollmentDto {
  @IsOptional()
  @IsUUID('4')
  student_id?: string;

  @IsOptional()
  @IsUUID('4')
  course_id?: string;

  @IsOptional()
  @IsEnum(EnrollmentStatus)
  status?: EnrollmentStatus;

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
