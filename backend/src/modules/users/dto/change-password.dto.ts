// src/modules/users/dto/change-password.dto.ts
import { IsString, Matches, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @MinLength(8)
  old_password: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Mật khẩu mới phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 số',
  })
  new_password: string;

  @IsString()
  @MinLength(8)
  confirm_new_password: string;
}
