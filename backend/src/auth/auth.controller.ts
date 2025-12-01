import { Controller, Get, Post, Body, Request, UseGuards, Param, Query } from '@nestjs/common';
import { CreateAuthDto } from './dto/create-auth.dto';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './passport/local-auth.guard';
import { JwtAuthGuard } from './passport/jwt-auth.guard';
import { Public, ResponseMessage } from '@/decorator/customize';
import { MailerService } from '@nestjs-modules/mailer';
import { ApiTags, ApiOperation, ApiBody, ApiBearerAuth, ApiOkResponse, ApiCreatedResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { LoginAuthDto } from './dto/login-auth.dto';

class LoginResponseDto {
  access_token: string;
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
  @ResponseMessage("Fetch login")
  @ApiOperation({ summary: 'Login' })
  @ApiBody({ type: LoginAuthDto })
  @ApiOkResponse({ description: 'Login successful', type: LoginResponseDto })
  handleLogin(@Request() req) {
    return this.authService.login(req.user);
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
        refreshToken: { type: 'string' }
      }
    }
  })
  @ApiOkResponse({ description: 'New access token returned', type: LoginResponseDto })
  async refreshAccessToken(@Body() body: { userId: string; refreshToken: string }) {
    return this.authService.refreshToken(body.userId, body.refreshToken);
  }

  @Post('register')
  @Public()
  @ApiOperation({ summary: 'Register account and send activation link' })
  @ApiBody({ type: CreateAuthDto })
  @ApiCreatedResponse({ description: 'Register successful, activation link sent to email', type: MessageResponseDto })
  register(@Body() registerDto: CreateAuthDto) {
    return this.authService.handleRegister(registerDto);
  }

  @Get('activate')
  @Public()
  @ResponseMessage("Account activated successfully")
  @ApiOperation({ summary: 'Activate account via activation link' })
  @ApiQuery({ 
    name: 'token', 
    description: 'Activation token from email link',
    type: 'string'
  })
  @ApiOkResponse({ description: 'Account activated successfully', type: MessageResponseDto })
  activateAccount(@Query('token') token: string) {
    return this.authService.activateAccountByToken(token);
  }

  @Post('resend-activation')
  @Public()
  @ResponseMessage("Activation link resent successfully")
  @ApiOperation({ summary: 'Resend activation link' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email' }
      }
    }
  })
  @ApiOkResponse({ description: 'Activation link resent successfully', type: MessageResponseDto })
  resendActivationLink(@Body() body: { email: string }) {
    return this.authService.resendActivationLink(body.email);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage("Logout successfully")
  @ApiOperation({ summary: 'Logout' })
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Logout successful', type: MessageResponseDto })
  logout(@Request() req) {
    return this.authService.logout(req.user);
  }
}