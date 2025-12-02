// src/modules/enrollments/enrollments.service.ts
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { Enrollment } from './entities/enrollment.entity';
import {
  UpdateEnrollmentDto,
  EnrollmentStatus,
} from './dto/update-enrollment.dto';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { QueryEnrollmentDto } from './dto/query-enrollment.dto';
import { EnrollmentResponseDto } from './dto/enrollment-response.dto';
import { UserRole } from '@/modules/users/entities/user.entity';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class EnrollmentsService {
  constructor(
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
  ) {}

  // ======================================================
  // CREATE
  // ======================================================
  async createEnrollment(
    dto: CreateEnrollmentDto,
    studentId: string,
  ): Promise<Enrollment> {
    // Check đã enroll chưa (unique student_id + course_id)
    const existing = await this.enrollmentRepository.findOne({
      where: {
        student_id: studentId,
        course_id: dto.course_id,
      },
    });

    if (existing) {
      throw new BadRequestException(
        'Bạn đã đăng ký khoá học này rồi',
      );
    }

    const enrollment = this.enrollmentRepository.create({
      student_id: studentId,
      course_id: dto.course_id,
      status: EnrollmentStatus.ACTIVE,
      progress_percent: 0,
    });

    return this.enrollmentRepository.save(enrollment);
  }

  // ======================================================
  // LIST (với phân quyền)
  // ======================================================
  async findEnrollments(
    query: QueryEnrollmentDto,
    currentUserId: string,
    currentUserRole: UserRole,
  ): Promise<PaginatedResult<EnrollmentResponseDto>> {
    const qb = this.buildBaseQuery(query, currentUserId, currentUserRole);

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const [rows, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const data = rows.map((enrollment) =>
      this.toEnrollmentResponseDto(enrollment),
    );

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(
    id: string,
    currentUserId: string,
    currentUserRole: UserRole,
  ): Promise<EnrollmentResponseDto> {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { id },
      relations: ['student', 'course'],
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment không tồn tại');
    }

    this.ensureCanViewEnrollment(
      enrollment,
      currentUserId,
      currentUserRole,
    );

    return this.toEnrollmentResponseDto(enrollment);
  }

  // ======================================================
  // UPDATE
  // ======================================================
  async updateEnrollment(
    id: string,
    dto: UpdateEnrollmentDto,
    currentUserId: string,
    currentUserRole: UserRole,
  ): Promise<EnrollmentResponseDto> {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { id },
      relations: ['course'],
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment không tồn tại');
    }

    const isOwner = enrollment.student_id === currentUserId;
    const isTeacherOrAdmin =
      currentUserRole === UserRole.TEACHER ||
      currentUserRole === UserRole.ADMIN;

    // Student: chỉ được update progress_percent của chính mình
    if (currentUserRole === UserRole.STUDENT) {
      if (!isOwner) {
        throw new ForbiddenException(
          'Bạn không có quyền chỉnh sửa enrollment này',
        );
      }

      if (dto.progress_percent !== undefined) {
        enrollment.progress_percent = dto.progress_percent;
      } else {
        throw new ForbiddenException(
          'Bạn chỉ được phép cập nhật tiến độ học',
        );
      }
    } else if (isTeacherOrAdmin) {
      // Teacher/Admin: update được status + progress + last_accessed_at
      if (dto.status !== undefined) {
        enrollment.status = dto.status;
      }
      if (dto.progress_percent !== undefined) {
        enrollment.progress_percent = dto.progress_percent;
      }
      if (dto.last_accessed_at !== undefined) {
        enrollment.last_accessed_at = dto.last_accessed_at;
      }
    } else {
      throw new ForbiddenException(
        'Bạn không có quyền chỉnh sửa enrollment này',
      );
    }

    const saved = await this.enrollmentRepository.save(enrollment);
    const withRelations = await this.enrollmentRepository.findOne({
      where: { id: saved.id },
      relations: ['student', 'course'],
    });

    if (!withRelations) {
      throw new NotFoundException(
        'Không tìm thấy enrollment sau khi cập nhật',
      );
    }

    return this.toEnrollmentResponseDto(withRelations);
  }

  // ======================================================
  // DELETE (chỉ ADMIN)
  // ======================================================
  async deleteEnrollment(
    id: string,
    currentUserRole: UserRole,
  ): Promise<{ message: string }> {
    if (currentUserRole !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Chỉ admin mới được xoá enrollment',
      );
    }

    const enrollment = await this.enrollmentRepository.findOne({
      where: { id },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment không tồn tại');
    }

    await this.enrollmentRepository.delete(id);

    return { message: 'Xoá enrollment thành công' };
  }

  // ======================================================
  // PRIVATE HELPERS
  // ======================================================
  private buildBaseQuery(
    query: QueryEnrollmentDto,
    currentUserId: string,
    currentUserRole: UserRole,
  ): SelectQueryBuilder<Enrollment> {
    const qb = this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .leftJoinAndSelect('enrollment.student', 'student')
      .leftJoinAndSelect('enrollment.course', 'course');

    // Phân quyền:
    if (currentUserRole === UserRole.STUDENT) {
      // Student chỉ xem enrollment của chính mình
      qb.andWhere('enrollment.student_id = :studentId', {
        studentId: currentUserId,
      });
    } else if (currentUserRole === UserRole.TEACHER) {
      // Teacher xem các enrollment của khoá mình dạy
      qb.andWhere('course.teacher_id = :teacherId', {
        teacherId: currentUserId,
      });
    } else if (currentUserRole === UserRole.ADMIN) {
      // Admin có thể dùng filter student_id / course_id trong query
      if (query.student_id) {
        qb.andWhere('enrollment.student_id = :studentId', {
          studentId: query.student_id,
        });
      }
      if (query.course_id) {
        qb.andWhere('enrollment.course_id = :courseId', {
          courseId: query.course_id,
        });
      }
    }

    // Các filter khác dùng chung
    if (query.status) {
      qb.andWhere('enrollment.status = :status', {
        status: query.status,
      });
    }

    qb.orderBy('enrollment.enrolled_at', 'DESC');

    return qb;
  }

  private ensureCanViewEnrollment(
    enrollment: Enrollment,
    currentUserId: string,
    currentUserRole: UserRole,
  ): void {
    const isOwner = enrollment.student_id === currentUserId;
    const isAdmin = currentUserRole === UserRole.ADMIN;

    // Teacher có thể xem nếu là người dạy course đó (nếu cần, có thể check course.teacher_id)
    const isTeacher = currentUserRole === UserRole.TEACHER;

    if (isOwner || isAdmin) {
      return;
    }

    if (isTeacher && (enrollment as any).course?.teacher_id === currentUserId) {
      return;
    }

    throw new ForbiddenException(
      'Bạn không có quyền xem enrollment này',
    );
  }

  private toEnrollmentResponseDto(
    enrollment: Enrollment,
  ): EnrollmentResponseDto {
    return {
      id: enrollment.id,
      status: enrollment.status,
      progress_percent: Number(enrollment.progress_percent),
      last_accessed_at: enrollment.last_accessed_at,
      enrolled_at: enrollment.enrolled_at,
      student: {
        id: enrollment.student?.id ?? enrollment.student_id,
        full_name: enrollment.student?.full_name ?? '',
        avatar_url: enrollment.student?.avatar_url ?? '',
      },
      course: {
        id: enrollment.course?.id ?? enrollment.course_id,
        title: enrollment.course?.title ?? '',
        thumbnail_url: enrollment.course?.thumbnail_url ?? '',
      },
    };
  }
}
