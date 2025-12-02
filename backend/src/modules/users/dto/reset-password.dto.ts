// src/modules/users/dto/reset-password.dto.ts
import { IsString, MinLength, Matches } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  reset_code: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Mật khẩu mới phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 số',
  })
  new_password: string;
}
