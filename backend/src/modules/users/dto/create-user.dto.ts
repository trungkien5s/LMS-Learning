import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsEnum,
  Matches,
} from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class CreateUserDto {
  @IsString({ message: 'Tên phải là chuỗi ký tự' })
  @MinLength(2, { message: 'Tên phải có ít nhất 2 ký tự' })
  @MaxLength(255, { message: 'Tên không được vượt quá 255 ký tự' })
  full_name: string;

  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 số',
  })
  password: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{10,11}$/, { message: 'Số điện thoại không hợp lệ' })
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  avatar_url?: string;

    @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;   // chỉ admin được gán

  // ⚠️ Role được gán tự động ở service, không cho user tự chọn
  // Nếu cần tạo teacher/admin, dùng endpoint riêng cho admin
}