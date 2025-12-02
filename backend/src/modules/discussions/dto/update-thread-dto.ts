import { IsOptional, IsString, MinLength } from "class-validator";

// ---------- UPDATE THREAD DTO ----------
export class UpdateThreadDto {
  @IsOptional()
  @IsString()
  @MinLength(5)
  title?: string;

  @IsOptional()
  pinned?: boolean; // Chỉ teacher/admin mới pin được
}