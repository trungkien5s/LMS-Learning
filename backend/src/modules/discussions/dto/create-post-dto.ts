import { IsOptional, IsString, IsUUID, MinLength } from "class-validator";

// ---------- CREATE POST DTO ----------
export class CreatePostDto {
  @IsString()
  @MinLength(1, { message: 'Nội dung không được để trống' })
  content: string;

  @IsOptional()
  @IsString()
  @IsUUID('4')
  parent_id?: string; // Nếu có -> là reply, nếu null -> comment gốc

  // ⚠️ thread_id truyền qua URL: POST /threads/:threadId/posts
  // ⚠️ created_by lấy từ JWT token
}