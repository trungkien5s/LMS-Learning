import { IsString, MinLength } from "class-validator";

// ---------- UPDATE POST DTO ----------
export class UpdatePostDto {
  @IsString()
  @MinLength(1)
  content: string;

  // Chỉ cho phép update content, không đổi parent_id
}