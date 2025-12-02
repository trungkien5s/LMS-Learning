// src/modules/users/dto/user-response.dto.ts
import { Exclude } from 'class-transformer';
import { AccountType, UserRole } from '../entities/user.entity';

export class UserResponseDto {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  address?: string;
  avatar_url?: string;
  role: UserRole;
  account_type: AccountType;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;

  // ⚠️ Loại bỏ các field nhạy cảm
  @Exclude()
  password_hash: string;

  @Exclude()
  activation_token: string;

  @Exclude()
  reset_password_token: string;

  @Exclude()
  refresh_token: string;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }
}