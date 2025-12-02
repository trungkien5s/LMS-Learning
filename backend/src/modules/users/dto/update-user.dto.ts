import { IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";

// src/modules/users/dto/update-user.dto.ts
export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  full_name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{10,11}$/)
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  avatar_url?: string;

  // ⚠️ KHÔNG cho update: email, password, role, account_type
}