import { IsEnum } from "class-validator";
import { UserRole } from "../entities/user.entity";

export class UpdateRoleDto {
  @IsEnum(UserRole, { message: 'Role không hợp lệ' })
  role: UserRole;
}


