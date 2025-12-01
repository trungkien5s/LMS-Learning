// src/modules/users/users.service.ts
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateAuthDto } from '@/auth/dto/create-auth.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './entities/user.entity';
import { Injectable, BadRequestException } from '@nestjs/common';
import { comparePasswordHelper, hashPasswordHelper } from '@/helpers/util';
import aqp from 'api-query-params';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import { MailerService } from '@nestjs-modules/mailer';
import { randomBytes } from 'crypto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly mailerService: MailerService,
  ) {}

  async isEmailExist(email: string) {
    const user = await this.userRepository.findOne({ where: { email } });
    return !!user;
  }

  async create(dto: CreateUserDto) {
    const { name, email, password, phone, address, image } = dto;

    const isExist = await this.isEmailExist(email);
    if (isExist) {
      throw new BadRequestException(`Email đã tồn tại: ${email}`);
    }

    const hashed = await hashPasswordHelper(password);
    const user = this.userRepository.create({
      name,
      email,
      password: hashed,
      phone,
      address,
      image,
    });
    await this.userRepository.save(user);
    return { _id: user.id }; // FE vẫn dùng _id thì map từ id sang _id
  }

  async findAll(query: string, current: number, pageSize: number, role?: string) {
    const { filter, sort } = aqp(query || '');

    const page = Number(current) || 1;
    const size = Number(pageSize) || 10;
    const skip = (page - 1) * size;

    const [results, total] = await this.userRepository.findAndCount({
      where: role ? { role } : {},
      skip,
      take: size,
      order: sort as any,
    });

    return {
      results,
      totalPages: Math.ceil(total / size),
    };
  }

  async findOne(id: string) {
    // nếu password đang @Column({ select: false }) thì findOne bình thường sẽ không có password
    return await this.userRepository.findOne({
      where: { id },
      // nếu muốn loại password ra, có thể dùng select cụ thể các field khác
      // select: ['id', 'name', 'email', 'phone', 'address', 'image', 'role', 'isActive'],
    });
  }

  // 👉 Thêm hàm findById để AuthService.refreshToken dùng
  async findById(id: string) {
    return await this.userRepository.findOne({ where: { id } });
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.userRepository.update(id, dto);
    return { message: 'Cập nhật thành công' };
  }

  async remove(id: string) {
    await this.userRepository.delete(id);
    return { message: 'Xoá thành công' };
  }

  async findByEmail(email: string) {
    return await this.userRepository.findOne({ where: { email } });
  }

  async requestPasswordReset(email: string) {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) throw new BadRequestException('Email không tồn tại');

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const codeExpired = dayjs().add(10, 'minutes').toDate();

    await this.userRepository.update(user.id, {
      resetCode,
      resetCodeExpire: codeExpired,
    });

    await this.mailerService.sendMail({
      to: email,
      subject: 'Mã xác nhận đặt lại mật khẩu',
      template: 'reset-password-code',
      context: { name: user.name, code: resetCode },
    });

    return { message: 'Đã gửi email reset password' };
  }

  async resetPassword(code: string, newPassword: string) {
    const user = await this.userRepository.findOne({
      where: { resetCode: code },
    });
    if (!user) throw new BadRequestException('Mã xác nhận không hợp lệ');

    if (user.resetCodeExpire < new Date()) {
      throw new BadRequestException('Mã xác nhận đã hết hạn');
    }

    // lấy lại user có password để so sánh
    const userWithPassword = await this.userRepository.findOne({
      where: { id: user.id },
      select: ['id', 'password'],
    });

    const isSame = await comparePasswordHelper(
      newPassword,
      userWithPassword.password,
    );
    if (isSame) {
      throw new BadRequestException(
        'Mật khẩu mới không được trùng với mật khẩu cũ',
      );
    }

    const hashed = await hashPasswordHelper(newPassword);
    await this.userRepository.update(user.id, {
      password: hashed,
      resetCode: null,
      resetCodeExpire: null,
    });

    return { message: 'Đổi mật khẩu thành công' };
  }

  // ✅ ĐÃ CHUYỂN từ userModel.findByIdAndUpdate sang TypeORM
  async saveRefreshToken(
    userId: string,
    refreshToken: string,
    expiry: Date,
  ) {
    await this.userRepository.update(userId, {
      refreshToken,
      refreshTokenExpiry: expiry,
    });
    return this.userRepository.findOne({ where: { id: userId } });
  }

  // ✅ Thêm hàm xoá refresh token để dùng khi logout
  async removeRefreshToken(userId: string) {
    await this.userRepository.update(userId, {
      refreshToken: null,
      refreshTokenExpiry: null,
    });
  }

  // 👉 Dùng codeId + codeExpired làm activation token
  async updateActivationToken(
    userId: string,
    token: string,
    expiry: Date,
  ) {
    await this.userRepository.update(userId, {
      codeId: token,
      codeExpired: expiry,
    });
  }

  async findByActivationToken(token: string) {
    return await this.userRepository.findOne({
      where: { codeId: token },
    });
  }

  async activateUser(userId: string) {
    await this.userRepository.update(userId, {
      isActive: true,
      codeId: null,
      codeExpired: null,
    });
  }

  // Hàm register cũ của bạn – có thể giữ lại nếu còn dùng
// hoặc giữ uuidv4 cũng được, tuỳ bạn

// ...

async handleRegister(dto: CreateAuthDto) {
  const { name, email, password } = dto;

  const isExist = await this.isEmailExist(email);
  if (isExist) throw new BadRequestException('Email đã tồn tại');

  const hashed = await hashPasswordHelper(password);

  // Bạn có thể dùng uuidv4 như cũ:
  // const codeId = uuidv4();

  // Hoặc dùng token random 32 bytes:
  const codeId = randomBytes(32).toString('hex');

  const user = this.userRepository.create({
    name,
    email,
    password: hashed,
    isActive: false,
    codeId,                                      // lưu token vào codeId
    codeExpired: dayjs().add(30, 'minutes').toDate(), // hết hạn sau 30 phút
  });

  await this.userRepository.save(user);

  // 🔗 Tạo link kích hoạt
  const baseUrl =
    process.env.FRONTEND_URL ||
    process.env.BACKEND_URL ||
    'http://localhost:3000';

  const activationUrl = `${baseUrl}/auth/activate?token=${codeId}`;

  await this.mailerService.sendMail({
    to: user.email,
    subject: 'Activate your account at @trungkien',
    template: 'register', // hoặc 'activation' tùy bạn
    context: {
      name: user.name ?? user.email,
      activationCode: codeId,   // nếu template vẫn muốn hiển thị mã
      activationUrl,            // để user chỉ cần bấm link
    },
  });

  return { _id: user.id };
}

}
