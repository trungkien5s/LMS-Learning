// src/auth/auth.service.ts
import { comparePasswordHelper } from '@/helpers/util';
import { UsersService } from '@/modules/users/users.service';
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CreateAuthDto } from './dto/create-auth.dto';
import { MailerService } from '@nestjs-modules/mailer';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailerService: MailerService,
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(username);
    if (!user) return null;

    const isValidPassword = await comparePasswordHelper(pass, user.password);
    if (!isValidPassword) return null;

    return user;
  }

  async login(user: any) {
    if (!user.isActive) {
      throw new BadRequestException('Tài khoản chưa được kích hoạt.');
    }

    const payload = {
      username: user.email,
      sub: user.id, // ✅ TypeORM: dùng id
      role: user.role,
    };
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRED || '30m',
    });

    // Tạo refresh token random
    const refreshToken = randomBytes(64).toString('hex');
    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7);

    // Lưu refreshToken vào DB
    await this.usersService.saveRefreshToken(user.id, refreshToken, refreshTokenExpiry);

    return {
      user: {
        _id: user.id, // nếu FE đang dùng _id thì map từ id
        email: user.email,
        name: user.name,
        role: user.role,
      },
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  async refreshToken(userId: string, refreshToken: string) {
    // Kiểm tra refresh token trong DB
    const user = await this.usersService.findById(userId);
    if (
      !user ||
      !user.refreshToken ||
      user.refreshToken !== refreshToken ||
      !user.refreshTokenExpiry ||
      new Date() > new Date(user.refreshTokenExpiry)
    ) {
      throw new UnauthorizedException(
        'Refresh token không hợp lệ hoặc đã hết hạn.',
      );
    }

    const payload = {
      username: user.email,
      sub: user.id,
      role: user.role,
    };
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRED || '30m',
    });
    return { access_token: accessToken };
  }

  // Nếu UsersService.handleRegister đã có (như trên) thì đoạn fallback này sẽ không chạy.
  // Bạn có thể xoá fallback nếu muốn, nhưng để nguyên cũng không sao.
  async handleRegister(registerDto: CreateAuthDto) {
    if (typeof this.usersService.handleRegister === 'function') {
      return await this.usersService.handleRegister(registerDto);
    }

    // Fallback: dùng activation token kiểu link
    const existing = await this.usersService.findByEmail(registerDto.email);
    if (existing) {
      throw new BadRequestException('Email already exists');
    }

    const createUserPayload = {
      name: registerDto.name,
      email: registerDto.email,
      password: registerDto.password,
      phone: (registerDto as any).phone ?? '',
      address: (registerDto as any).address ?? '',
      image: (registerDto as any).image ?? '',
    } as any;

    const created = await this.usersService.create(createUserPayload);

    const userId =
      created && created._id
        ? typeof created._id.toString === 'function'
          ? created._id.toString()
          : String(created._id)
        : String(created);

    const activationToken = randomBytes(32).toString('hex');
    const activationTokenExpiry = new Date(
      Date.now() + 24 * 60 * 60 * 1000,
    ); // 24h

    await this.usersService.updateActivationToken(
      userId,
      activationToken,
      activationTokenExpiry,
    );

    await this.sendActivationEmail(
      registerDto.email,
      registerDto.name,
      activationToken,
    );

    return {
      message:
        'Registration successful! Please check your email to activate your account.',
    };
  }

  async activateAccountByToken(token: string) {
    const user = await this.usersService.findByActivationToken(token);
    if (!user) {
      throw new BadRequestException('Invalid or expired activation token');
    }
    await this.usersService.activateUser(user.id);
    return { message: 'Account activated successfully! You can now login.' };
  }

  async resendActivationLink(email: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isActive) {
      throw new BadRequestException('Account is already activated');
    }

    const activationToken = randomBytes(32).toString('hex');
    const activationTokenExpiry = new Date(
      Date.now() + 24 * 60 * 60 * 1000,
    );

    await this.usersService.updateActivationToken(
      user.id,
      activationToken,
      activationTokenExpiry,
    );

    await this.sendActivationEmail(user.email, user.name, activationToken);

    return {
      message: 'Activation link resent successfully! Please check your email.',
    };
  }

  private async sendActivationEmail(
    email: string,
    name: string,
    token: string,
  ) {
    const activationUrl = `${
      process.env.FRONTEND_URL || process.env.BACKEND_URL || 'http://localhost:3000'
    }/auth/activate?token=${token}`;
    await this.mailerService.sendMail({
      to: email,
      subject: 'Activate Your Account',
      template: 'activation', // đảm bảo có template này
      context: {
        name,
        activationUrl,
      },
    });
  }

  async logout(user: any) {
    const userId = (user.id || user._id || user.sub) as string;

    await this.usersService.removeRefreshToken(userId);

    return {
      message: 'Đăng xuất thành công',
      statusCode: 200,
      data: {
        userId,
        email: user.email || user.username,
        logoutTime: new Date().toISOString(),
      },
    };
  }
}
