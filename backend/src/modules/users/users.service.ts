// src/modules/users/users.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateAuthDto } from '@/auth/dto/create-auth.dto';

import { MailerService } from '@nestjs-modules/mailer';
import { randomBytes } from 'crypto';
import dayjs from 'dayjs';
import aqp from 'api-query-params';

import {
  hashPasswordHelper,
  comparePasswordHelper,
} from '@/helpers/util';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly mailerService: MailerService,
  ) {}

  // ======================= COMMON HELPERS =======================

  async isEmailExist(email: string): Promise<boolean> {
    const user = await this.userRepository.findOne({ where: { email } });
    return !!user;
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  // ========================== CRUD ==============================

  async create(dto: CreateUserDto) {
    const { full_name, email, password, phone, address, avatar_url, role } =
      dto;

    const isExist = await this.isEmailExist(email);
    if (isExist) {
      throw new BadRequestException(`Email đã tồn tại: ${email}`);
    }

    const hashed = await hashPasswordHelper(password);

    const user = this.userRepository.create({
      full_name,
      email,
      password_hash: hashed,
      phone,
      address,
      avatar_url,
      role,
    });

    await this.userRepository.save(user);

    return { _id: user.id };
  }

  async findAll(
  query: string,
  current: number,
  pageSize: number,
  role?: string,
) {
  const { filter, sort } = aqp(query || '');

  const page = Number(current) || 1;
  const size = Number(pageSize) || 10;
  const skip = (page - 1) * size;

  const where: Record<string, unknown> = { ...filter };
  if (role) where.role = role;

  // ✅ map từ 1 / -1 → 'ASC' / 'DESC'
  const order: Record<string, 'ASC' | 'DESC'> = {};
  if (sort) {
    Object.entries(sort as Record<string, number>).forEach(
      ([key, value]) => {
        if (value === 1) {
          order[key] = 'ASC';
        } else if (value === -1) {
          order[key] = 'DESC';
        }
      },
    );
  }

  const [results, total] = await this.userRepository.findAndCount({
    where,
    skip,
    take: size,
    order, // 👈 dùng order đã chuyển kiểu
  });

  return {
    results,
    totalPages: Math.ceil(total / size),
  };
}


  async findOne(id: string) {
    return this.userRepository.findOne({
      where: { id },
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.userRepository.update(id, dto);
    return { message: 'Cập nhật thành công' };
  }

  async remove(id: string) {
    await this.userRepository.delete(id);
    return { message: 'Xoá thành công' };
  }

  // ===================== PASSWORD RESET =========================

  async requestPasswordReset(email: string) {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) throw new BadRequestException('Email không tồn tại');

    const resetCode = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();
    const codeExpired = dayjs().add(10, 'minutes').toDate();

    await this.userRepository.update(user.id, {
      reset_password_token: resetCode,
      reset_password_token_expiry: codeExpired,
    });

    await this.mailerService.sendMail({
      to: email,
      subject: 'Mã xác nhận đặt lại mật khẩu',
      template: 'reset-password-code',
      context: { name: user.full_name ?? user.email, code: resetCode },
    });

    return { message: 'Đã gửi email reset password' };
  }

  async resetPassword(code: string, newPassword: string) {
    const user = await this.userRepository.findOne({
      where: { reset_password_token: code },
    });
    if (!user) throw new BadRequestException('Mã xác nhận không hợp lệ');

    if (user.reset_password_token_expiry < new Date()) {
      throw new BadRequestException('Mã xác nhận đã hết hạn');
    }

    const userWithPassword = await this.userRepository.findOne({
      where: { id: user.id },
      select: ['id', 'password_hash'],
    });

    if (!userWithPassword) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    const isSame = await comparePasswordHelper(
      newPassword,
      userWithPassword.password_hash,
    );
    if (isSame) {
      throw new BadRequestException(
        'Mật khẩu mới không được trùng với mật khẩu cũ',
      );
    }

    const hashed = await hashPasswordHelper(newPassword);
    await this.userRepository.update(user.id, {
      password_hash: hashed,
      reset_password_token: null,
      reset_password_token_expiry: null,
    });

    return { message: 'Đổi mật khẩu thành công' };
  }

  // ================= CHANGE PASSWORD (ĐANG LOGIN) ===============

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
    confirmNewPassword: string,
  ) {
    if (newPassword !== confirmNewPassword) {
      throw new BadRequestException('Mật khẩu xác nhận không khớp');
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'password_hash'],
    });

    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    const isOldCorrect = await comparePasswordHelper(
      oldPassword,
      user.password_hash,
    );
    if (!isOldCorrect) {
      throw new BadRequestException('Mật khẩu cũ không chính xác');
    }

    const isSame = await comparePasswordHelper(
      newPassword,
      user.password_hash,
    );
    if (isSame) {
      throw new BadRequestException(
        'Mật khẩu mới không được trùng với mật khẩu cũ',
      );
    }

    const hashed = await hashPasswordHelper(newPassword);

    await this.userRepository.update(user.id, {
      password_hash: hashed,
    });

    return { message: 'Đổi mật khẩu thành công' };
  }

  // ===================== REFRESH TOKEN ==========================

  async saveRefreshToken(
    userId: string,
    refreshToken: string,
    expiry: Date,
  ) {
    await this.userRepository.update(userId, {
      refresh_token: refreshToken,
      refresh_token_expiry: expiry,
    });
    return this.userRepository.findOne({ where: { id: userId } });
  }

  async removeRefreshToken(userId: string) {
    await this.userRepository.update(userId, {
      refresh_token: null,
      refresh_token_expiry: null,
    });
  }

  // ==================== ACCOUNT ACTIVATION ======================

  async updateActivationToken(
    userId: string,
    token: string,
    expiry: Date,
  ) {
    await this.userRepository.update(userId, {
      activation_token: token,
      activation_token_expiry: expiry,
    });
  }

  async findByActivationToken(token: string) {
    return this.userRepository.findOne({
      where: { activation_token: token },
    });
  }

  async activateUser(userId: string) {
    await this.userRepository.update(userId, {
      is_active: true,
      activation_token: null,
      activation_token_expiry: null,
    });
  }

  // ======================== REGISTER ============================

  async handleRegister(dto: CreateAuthDto) {
    const { name, email, password } = dto;

    const isExist = await this.isEmailExist(email);
    if (isExist) throw new BadRequestException('Email đã tồn tại');

    const hashed = await hashPasswordHelper(password);
    const activationToken = randomBytes(32).toString('hex');

    const user = this.userRepository.create({
      full_name: name,
      email,
      password_hash: hashed,
      is_active: false,
      activation_token: activationToken,
      activation_token_expiry: dayjs().add(30, 'minutes').toDate(),
    });

    await this.userRepository.save(user);

    const baseUrl =
      process.env.FRONTEND_URL ||
      process.env.BACKEND_URL ||
      'http://localhost:3000';

    const activationUrl = `${baseUrl}/auth/activate?token=${activationToken}`;

    await this.mailerService.sendMail({
      to: user.email,
      subject: 'Kích hoạt tài khoản LMS',
      template: 'register',
      context: {
        name: user.full_name ?? user.email,
        activationCode: activationToken,
        activationUrl,
      },
    });

    return { _id: user.id };
  }
}
