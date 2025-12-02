import { IsString, IsOptional, MinLength, IsUUID } from 'class-validator';

export class CreateThreadDto {
  @IsString()
  @MinLength(5, { message: 'Tiêu đề phải có ít nhất 5 ký tự' })
  title: string;

  @IsString()
  @IsUUID('4')
  course_id: string;

  @IsOptional()
  @IsString()
  @IsUUID('4')
  lesson_id?: string; // Nếu null -> thảo luận chung cả khóa

  // ⚠️ created_by lấy từ JWT token
}

// ---------- UPDATE THREAD DTO ----------
export class UpdateThreadDto {
  @IsOptional()
  @IsString()
  @MinLength(5)
  title?: string;

  @IsOptional()
  pinned?: boolean; // Chỉ teacher/admin mới pin được
}