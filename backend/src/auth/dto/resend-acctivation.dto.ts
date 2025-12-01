import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

// DTO for resending activation link
export class ResendActivationDto {
  @ApiProperty({ 
    description: 'Email address to resend activation link to',
    example: 'user@example.com'
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}