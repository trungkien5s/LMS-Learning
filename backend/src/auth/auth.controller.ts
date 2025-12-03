// src/auth/auth.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Request,
  UseGuards,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { Response, Request as ExpressRequest } from 'express';
import { CreateAuthDto } from './dto/create-auth.dto';
import {
  AuthService,
  LoginResult,
  RefreshTokenResult,
  LogoutResult,
} from './auth.service';
import { LocalAuthGuard } from './passport/local-auth.guard';
import { JwtAuthGuard } from './passport/jwt-auth.guard';
import { Public, ResponseMessage } from '@/decorator/customize';
import { MailerService } from '@nestjs-modules/mailer';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { LoginAuthDto } from './dto/login-auth.dto';

const REFRESH_TOKEN_COOKIE_NAME = 'refresh_token';

const refreshTokenCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // dev có thể false
  sameSite: 'strict' as const,
  path: '/auth/refresh-token', // chỉ gửi kèm khi gọi endpoint này
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
};

// class LoginResponseDto {
class LoginResponseDto {
  access_token: string;
  user: {
    _id: string;
    email: string;
    name: string;
    role: string;
  };
}

class MessageResponseDto {
  message: string;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly mailerService: MailerService,
  ) {}

  @Post('login')
  @Public()
  @UseGuards(LocalAuthGuard)
  @ResponseMessage('Fetch login')
  @ApiOperation({ summary: 'Login' })
  @ApiBody({ type: LoginAuthDto })
  @ApiOkResponse({
    description: 'Login successful',
    type: LoginResponseDto,
  })
  async handleLogin(
    @Request() req,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {
    const result = await this.authService.login(req.user);

 
    res.cookie(
      REFRESH_TOKEN_COOKIE_NAME,
      result.refresh_token,
      refreshTokenCookieOptions,
    );


    return {
      access_token: result.access_token,
      user: result.user,
    };
  }


  @Post('refresh-token')
  @Public()
  @ResponseMessage('Refresh access token successfully')
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        refreshToken: { type: 'string' },
      },
    },
  })
  @ApiOkResponse({
    description: 'New access token returned',
    type: LoginResponseDto,
  })
  async refreshAccessToken(
    @Body() body: { userId: string; refreshToken: string },
  ): Promise<RefreshTokenResult> {
    return this.authService.refreshToken(body.refreshToken);
  }

  @Post('register')
  @Public()
  @ApiOperation({ summary: 'Register account and send activation link' })
  @ApiBody({ type: CreateAuthDto })
  @ApiCreatedResponse({
    description:
      'Register successful, activation link sent to email',
    type: MessageResponseDto,
  })
  register(
    @Body() registerDto: CreateAuthDto,
  ): Promise<{ _id: string }> {
    return this.authService.handleRegister(registerDto);
  }

  @Get('activate')
  @Public()
  @ResponseMessage('Account activated successfully')
  @ApiOperation({ summary: 'Activate account via activation link' })
  @ApiQuery({
    name: 'token',
    description: 'Activation token from email link',
    type: 'string',
  })
  @ApiOkResponse({
    description: 'Account activated successfully',
    type: MessageResponseDto,
  })
  activateAccount(
    @Query('token') token: string,
  ): Promise<{ message: string }> {
    return this.authService.activateAccountByToken(token);
  }

  @Post('resend-activation')
  @Public()
  @ResponseMessage('Activation link resent successfully')
  @ApiOperation({ summary: 'Resend activation link' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email' },
      },
    },
  })
  @ApiOkResponse({
    description: 'Activation link resent successfully',
    type: MessageResponseDto,
  })
  resendActivationLink(
    @Body() body: { email: string },
  ): Promise<{ message: string }> {
    return this.authService.resendActivationLink(body.email);
  }

    @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Logout successfully')
  @ApiOperation({ summary: 'Logout' })
  @ApiBearerAuth()
  @ApiOkResponse({
    description: 'Logout successful',
    type: MessageResponseDto,
  })
  async logout(
    @Request() req,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LogoutResult> {
    const result = await this.authService.logout(req.user);

    // 👉 Xóa cookie refresh token
    res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
      path: refreshTokenCookieOptions.path,
    });

    return result;
  }

}
