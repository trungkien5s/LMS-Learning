import { IsOptional, IsString, IsIn, IsUUID, IsNotEmpty } from 'class-validator';

export class UpdateUserDto {
  @IsUUID('4', { message: 'ID không hợp lệ (UUID v4)' })
  @IsNotEmpty({ message: 'ID không được để trống' })
  id: string;

  @IsOptional()
  name?: string;

  @IsOptional()
  phone?: string;

  @IsOptional()
  address?: string;

  @IsOptional()
  image?: string;

  @IsOptional()
  @IsIn(['USERS', 'ADMIN'], { message: 'Role phải là USERS hoặc ADMIN' })
  role?: string;
}
