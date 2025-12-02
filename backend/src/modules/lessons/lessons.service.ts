// src/modules/lessons/lessons.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Lesson, LessonType } from './entities/lesson.entity';
import { Course } from '../courses/entities/course.entity';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { ReorderLessonsDto } from './dto/reorder-lessons.dto';
import { UserRole } from '@/modules/users/entities/user.entity';

@Injectable()
export class LessonsService {
  constructor(
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) {}

  // ======================= HELPERS =======================

  private async ensureCanManageCourse(
    courseId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<Course> {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Khoá học không tồn tại');
    }

    const isOwner = course.teacher_id === userId;
    const isAdmin = userRole === UserRole.ADMIN;

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException(
        'Bạn không có quyền quản lý bài học của khoá học này',
      );
    }

    return course;
  }

  private slugify(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private async getNextOrderIndex(courseId: string): Promise<number> {
    const maxLesson = await this.lessonRepository.findOne({
      where: { course_id: courseId },
      order: { order_index: 'DESC' },
    });

    if (!maxLesson) return 1;
    return maxLesson.order_index + 1;
  }

  // ======================= CREATE ========================

  async createLesson(
    courseId: string,
    dto: CreateLessonDto,
    userId: string,
    userRole: UserRole,
  ): Promise<Lesson> {
    await this.ensureCanManageCourse(courseId, userId, userRole);

    const orderIndex =
      dto.order_index ?? (await this.getNextOrderIndex(courseId));

    const slugBase = this.slugify(dto.title);
    const slug = `${slugBase}-${Date.now()}`;

    const lesson = this.lessonRepository.create({
      title: dto.title,
      slug,
      type: dto.type,
      video_url: dto.video_url ?? null,
      content: dto.content ?? null,
      duration_seconds: dto.duration_seconds ?? null,
      order_index: orderIndex,
      is_preview: dto.is_preview ?? false,
      course_id: courseId,
    });

    return this.lessonRepository.save(lesson);
  }

  // ======================== READ =========================

  async findLessonsByCourse(courseId: string): Promise<Lesson[]> {
    const lessons = await this.lessonRepository.find({
      where: { course_id: courseId },
      order: { order_index: 'ASC' },
    });

    return lessons;
  }

  async findLessonInCourse(
    courseId: string,
    lessonId: string,
  ): Promise<Lesson> {
    const lesson = await this.lessonRepository.findOne({
      where: { id: lessonId, course_id: courseId },
    });

    if (!lesson) {
      throw new NotFoundException('Bài học không tồn tại trong khoá học này');
    }

    return lesson;
  }

  // ======================= UPDATE ========================

  async updateLesson(
    courseId: string,
    lessonId: string,
    dto: UpdateLessonDto,
    userId: string,
    userRole: UserRole,
  ): Promise<Lesson> {
    await this.ensureCanManageCourse(courseId, userId, userRole);

    const lesson = await this.lessonRepository.findOne({
      where: { id: lessonId, course_id: courseId },
    });

    if (!lesson) {
      throw new NotFoundException('Bài học không tồn tại');
    }

    if (dto.title !== undefined) {
      lesson.title = dto.title;
      // Có thể update slug nếu muốn
      lesson.slug = this.slugify(dto.title) + '-' + Date.now();
    }
    if (dto.type !== undefined) {
      lesson.type = dto.type;
    }
    if (dto.video_url !== undefined) {
      lesson.video_url = dto.video_url;
    }
    if (dto.content !== undefined) {
      lesson.content = dto.content;
    }
    if (dto.duration_seconds !== undefined) {
      lesson.duration_seconds = dto.duration_seconds;
    }
    if (dto.order_index !== undefined) {
      lesson.order_index = dto.order_index;
    }
    if (dto.is_preview !== undefined) {
      lesson.is_preview = dto.is_preview;
    }

    return this.lessonRepository.save(lesson);
  }

  // ======================= DELETE ========================

  async deleteLesson(
    courseId: string,
    lessonId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<{ message: string }> {
    await this.ensureCanManageCourse(courseId, userId, userRole);

    const lesson = await this.lessonRepository.findOne({
      where: { id: lessonId, course_id: courseId },
    });

    if (!lesson) {
      throw new NotFoundException('Bài học không tồn tại');
    }

    await this.lessonRepository.delete(lesson.id);

    return { message: 'Xoá bài học thành công' };
  }

  // ==================== REORDER LESSONS ==================

  async reorderLessons(
    courseId: string,
    dto: ReorderLessonsDto,
    userId: string,
    userRole: UserRole,
  ): Promise<{ message: string }> {
    await this.ensureCanManageCourse(courseId, userId, userRole);

    const lessonIds = dto.lessons.map((item) => item.id);

    const lessons = await this.lessonRepository.find({
      where: {
        id: In(lessonIds),
        course_id: courseId,
      },
    });

    if (lessons.length !== dto.lessons.length) {
      throw new ForbiddenException(
        'Danh sách bài học không hợp lệ hoặc chứa bài học không thuộc khoá này',
      );
    }

    const orderMap = new Map<string, number>();
    dto.lessons.forEach((item) => {
      orderMap.set(item.id, item.order_index);
    });

    lessons.forEach((lesson) => {
      const newIndex = orderMap.get(lesson.id);
      if (newIndex !== undefined) {
        lesson.order_index = newIndex;
      }
    });

    await this.lessonRepository.save(lessons);

    return { message: 'Cập nhật thứ tự bài học thành công' };
  }
}
