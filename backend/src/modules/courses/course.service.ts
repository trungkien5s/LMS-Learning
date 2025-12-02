// src/modules/courses/courses.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Course, CourseStatus } from './entities/course.entity';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { QueryCoursesDto } from './dto/query-courses.dto';
import { UserRole } from '@/modules/users/entities/user.entity';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) {}

  // ============================================
  // PUBLIC LIST + DETAIL
  // ============================================

  async findPublic(
    query: QueryCoursesDto,
  ): Promise<PaginatedResult<Course>> {
    const qb = this.buildBaseQuery(query);

    // Mặc định chỉ lấy course PUBLISHED nếu client không truyền status
    if (!query.status) {
      qb.andWhere('course.status = :status', {
        status: CourseStatus.PUBLISHED,
      });
    }

    return this.paginateQuery(qb, query.page, query.limit);
  }

  async findBySlug(slug: string): Promise<Course> {
    const course = await this.courseRepository.findOne({
      where: { slug },
      relations: ['teacher'],
    });
    if (!course || course.status !== CourseStatus.PUBLISHED) {
      // tuỳ bạn: cho phép xem draft nếu là teacher/admin thì xử lý ở controller
      throw new NotFoundException('Khoá học không tồn tại');
    }
    return course;
  }

  // ============================================
  // TEACHER / ADMIN
  // ============================================

  async create(
    dto: CreateCourseDto,
    teacherId: string,
  ): Promise<Course> {
    const slug = await this.generateUniqueSlug(dto.title);

    const course = this.courseRepository.create({
      title: dto.title,
      slug,
      description: dto.description,
      level: dto.level,
      price: dto.price,
      thumbnail_url: dto.thumbnail_url,
      status: CourseStatus.DRAFT,
      teacher_id: teacherId,
    });

    return this.courseRepository.save(course);
  }

  async findForManage(
    query: QueryCoursesDto,
  ): Promise<PaginatedResult<Course>> {
    const qb = this.buildBaseQuery(query);
    return this.paginateQuery(qb, query.page, query.limit);
  }

  async findOneById(id: string): Promise<Course> {
    const course = await this.courseRepository.findOne({
      where: { id },
      relations: ['teacher'],
    });
    if (!course) {
      throw new NotFoundException('Khoá học không tồn tại');
    }
    return course;
  }

  async update(
    id: string,
    dto: UpdateCourseDto,
    currentUserId: string,
    currentUserRole: UserRole,
  ): Promise<Course> {
    const course = await this.findOneById(id);

    this.ensureCanModifyCourse(course, currentUserId, currentUserRole);

    if (dto.title && dto.title !== course.title) {
      course.title = dto.title;
      course.slug = await this.generateUniqueSlug(dto.title, course.id);
    }

    if (dto.description !== undefined) {
      course.description = dto.description;
    }
    if (dto.level !== undefined) {
      course.level = dto.level;
    }
    if (dto.price !== undefined) {
      course.price = dto.price;
    }
    if (dto.thumbnail_url !== undefined) {
      course.thumbnail_url = dto.thumbnail_url;
    }
    if (dto.status !== undefined) {
      course.status = dto.status;
      if (dto.status === CourseStatus.PUBLISHED && !course.published_at) {
        course.published_at = new Date();
      }
    }

    return this.courseRepository.save(course);
  }

  async remove(
    id: string,
    currentUserId: string,
    currentUserRole: UserRole,
  ): Promise<void> {
    const course = await this.findOneById(id);

    this.ensureCanModifyCourse(course, currentUserId, currentUserRole);

    await this.courseRepository.delete(id);
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private ensureCanModifyCourse(
    course: Course,
    currentUserId: string,
    currentUserRole: UserRole,
  ): void {
    const isOwner = course.teacher_id === currentUserId;
    const isAdmin = currentUserRole === UserRole.ADMIN;

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa khoá học này');
    }
  }

  private buildBaseQuery(
    query: QueryCoursesDto,
  ): SelectQueryBuilder<Course> {
    const qb = this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.teacher', 'teacher');

    if (query.status) {
      qb.andWhere('course.status = :status', { status: query.status });
    }

    if (query.level) {
      qb.andWhere('course.level = :level', { level: query.level });
    }

    if (query.search) {
      const search = `%${query.search.toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(course.title) LIKE :search OR LOWER(course.description) LIKE :search)',
        { search },
      );
    }

    if (query.teacher_id) {
      qb.andWhere('course.teacher_id = :teacherId', {
        teacherId: query.teacher_id,
      });
    }

    if (query.min_price !== undefined) {
      qb.andWhere('course.price >= :minPrice', {
        minPrice: query.min_price,
      });
    }

    if (query.max_price !== undefined) {
      qb.andWhere('course.price <= :maxPrice', {
        maxPrice: query.max_price,
      });
    }

    qb.orderBy('course.created_at', 'DESC');

    return qb;
  }

  private async paginateQuery(
    qb: SelectQueryBuilder<Course>,
    pageParam?: number,
    limitParam?: number,
  ): Promise<PaginatedResult<Course>> {
    const page = pageParam ?? 1;
    const limit = limitParam ?? 10;

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages,
    };
  }

  private async generateUniqueSlug(
    title: string,
    currentId?: string,
  ): Promise<string> {
    const baseSlug = this.slugify(title);
    let slug = baseSlug;
    let counter = 1;

    // nếu update: có thể giữ nguyên slug nếu chỉ trùng với chính nó
    // loop kiểm tra trùng
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const existing = await this.courseRepository.findOne({
        where: { slug },
      });

      if (!existing || (currentId && existing.id === currentId)) {
        return slug;
      }

      slug = `${baseSlug}-${counter}`;
      counter += 1;
    }
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/[\s_]+/g, '-') // space & underscore -> dash
      .replace(/[^a-z0-9-]/g, '') // remove non-alphanumeric
      .replace(/-+/g, '-'); // collapse multiple dashes
  }
}
