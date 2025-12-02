// src/modules/enrollments/dto/update-enrollment.dto.ts
import { IsEnum, IsNumber, IsOptional, Min, Max } from 'class-validator';

export enum EnrollmentStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export class UpdateEnrollmentDto {
  @IsOptional()
  @IsEnum(EnrollmentStatus)
  status?: EnrollmentStatus;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  progress_percent?: number;

  @IsOptional()
  last_accessed_at?: Date;
}
