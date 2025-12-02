// src/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import { MailerService } from '@nestjs-modules/mailer';

import { comparePasswordHelper } from '@/helpers/util';
import { UsersService } from '@/modules/users/users.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { User, UserRole } from '@/modules/users/entities/user.entity';

export interface JwtPayload {
  sub: string;
  role: UserRole;
  username: string; // email
}

export interface LoginUserPayload {
  _id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface LoginResult {
  user: LoginUserPayload;
  access_token: string;
  refresh_token: string;
}

export interface RefreshTokenResult {
  access_token: string;
}

interface LogoutInput {
  id?: string;
  _id?: string;
  sub?: string;
  email?: string;
  username?: string;
}

export interface LogoutResult {
  message: string;
  statusCode: number;
  data: {
    userId: string;
    email?: string;
    logoutTime: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailerService: MailerService,
  ) {}

  // =====================================================
  // LOCAL STRATEGY: validate user (email + password)
  // =====================================================
  async validateUser(
    username: string,
    pass: string,
  ): Promise<User | null> {
    const user = await this.usersService.findByEmail(username);
    if (!user) return null;

    const isValidPassword = await comparePasswordHelper(
      pass,
      user.password_hash,
    );
    if (!isValidPassword) return null;

    return user;
  }

  // =====================================================
  // LOGIN
  // =====================================================
  async login(user: User): Promise<LoginResult> {
    if (!user.is_active) {
      throw new BadRequestException('Tài khoản chưa được kích hoạt.');
    }

    const payload: JwtPayload = {
      username: user.email,
      sub: user.id,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRED || '30m',
    });

    // Tạo refresh token random
    const refreshToken = randomBytes(64).toString('hex');
    const refreshTokenExpiry = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ); // 7 ngày

    // Lưu refreshToken vào DB
    await this.usersService.saveRefreshToken(
      user.id,
      refreshToken,
      refreshTokenExpiry,
    );

    return {
      user: {
        _id: user.id,
        email: user.email,
        name: user.full_name,
        role: user.role,
      },
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  // =====================================================
  // REFRESH TOKEN
  // =====================================================
  async refreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<RefreshTokenResult> {
    const user = await this.usersService.findById(userId);

    if (
      !user ||
      !user.refresh_token ||
      user.refresh_token !== refreshToken ||
      !user.refresh_token_expiry ||
      new Date() > new Date(user.refresh_token_expiry)
    ) {
      throw new UnauthorizedException(
        'Refresh token không hợp lệ hoặc đã hết hạn.',
      );
    }

    const payload: JwtPayload = {
      username: user.email,
      sub: user.id,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRED || '30m',
    });

    return { access_token: accessToken };
  }

  // =====================================================
  // REGISTER (uỷ quyền cho UsersService.handleRegister)
  // =====================================================
  async handleRegister(
    registerDto: CreateAuthDto,
  ): Promise<{ _id: string }> {
    return this.usersService.handleRegister(registerDto);
  }

  // =====================================================
  // ACTIVATE ACCOUNT
  // =====================================================
  async activateAccountByToken(
    token: string,
  ): Promise<{ message: string }> {
    const user = await this.usersService.findByActivationToken(token);
    if (!user) {
      throw new BadRequestException(
        'Invalid or expired activation token',
      );
    }

    if (
      user.activation_token_expiry &&
      user.activation_token_expiry < new Date()
    ) {
      throw new BadRequestException(
        'Activation token has expired. Please request a new one.',
      );
    }

    await this.usersService.activateUser(user.id);

    return {
      message: 'Account activated successfully! You can now login.',
    };
  }

  // =====================================================
  // RESEND ACTIVATION LINK
  // =====================================================
  async resendActivationLink(
    email: string,
  ): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.is_active) {
      throw new BadRequestException('Account is already activated');
    }

    const activationToken = randomBytes(32).toString('hex');
    const activationTokenExpiry = new Date(
      Date.now() + 24 * 60 * 60 * 1000,
    ); // 24h

    await this.usersService.updateActivationToken(
      user.id,
      activationToken,
      activationTokenExpiry,
    );

    await this.sendActivationEmail(
      user.email,
      user.full_name ?? user.email,
      activationToken,
    );

    return {
      message:
        'Activation link resent successfully! Please check your email.',
    };
  }

  // =====================================================
  // SEND ACTIVATION EMAIL (private)
  // =====================================================
  private async sendActivationEmail(
    email: string,
    name: string,
    token: string,
  ): Promise<void> {
    const activationUrl = `${
      process.env.FRONTEND_URL ||
      process.env.BACKEND_URL ||
      'http://localhost:3000'
    }/auth/activate?token=${token}`;

    await this.mailerService.sendMail({
      to: email,
      subject: 'Activate Your Account',
      template: 'activation',
      context: {
        name,
        activationUrl,
      },
    });
  }

  // =====================================================
  // LOGOUT
  // =====================================================
  async logout(user: LogoutInput): Promise<LogoutResult> {
    const userId = user.id ?? user._id ?? user.sub ?? '';

    if (!userId) {
      throw new BadRequestException('User ID is missing in token');
    }

    await this.usersService.removeRefreshToken(userId);

    return {
      message: 'Đăng xuất thành công',
      statusCode: 200,
      data: {
        userId,
        email: user.email ?? user.username,
        logoutTime: new Date().toISOString(),
      },
    };
  }
}
