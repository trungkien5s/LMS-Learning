// src/modules/discussions/discussions.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';


import { UserRole } from '@/modules/users/entities/user.entity';
import { DiscussionThread } from './entites/discussion-thread.entity';
import { DiscussionPost } from './entites/discussion-post.entity';
import { CreateThreadDto, UpdateThreadDto } from './dto/create-discussion-thread-dto';
import { QueryThreadsDto } from './dto/query-thread-dto';
import { ThreadResponseDto } from './dto/thread-response-dto';
import { CreatePostDto } from './dto/create-post-dto';
import { UpdatePostDto } from './dto/update-post-dto';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class DiscussionsService {
  constructor(
    @InjectRepository(DiscussionThread)
    private readonly threadRepository: Repository<DiscussionThread>,
    @InjectRepository(DiscussionPost)
    private readonly postRepository: Repository<DiscussionPost>,
  ) {}

  // ============================================================
  // THREADS
  // ============================================================

  async createThread(
    dto: CreateThreadDto,
    currentUserId: string,
  ): Promise<DiscussionThread> {
    const thread = this.threadRepository.create({
      title: dto.title,
      course_id: dto.course_id,
      lesson_id: dto.lesson_id ?? null,
      created_by: currentUserId,
      pinned: false,
    });

    return this.threadRepository.save(thread);
  }

  async getThreads(
  query: QueryThreadsDto,
): Promise<PaginatedResult<ThreadResponseDto>> {
  const qb = this.buildThreadsBaseQuery(query);

  const page = query.page ?? 1;
  const limit = query.limit ?? 10;

  const [threads, total] = await qb
    .skip((page - 1) * limit)
    .take(limit)
    .getManyAndCount();   // 👈👈 SỬA Ở ĐÂY

  const data = threads.map((thread) =>
    this.toThreadResponseDto(thread),
  );

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}


  async getThreadById(id: string): Promise<ThreadResponseDto> {
    const thread = await this.threadRepository.findOne({
      where: { id },
      relations: [
        'course',
        'lesson',
        'created_by_user',
        'posts',
        'posts.created_by_user',
      ],
      order: {
        posts: {
          created_at: 'ASC',
        },
      },
    });

    if (!thread) {
      throw new NotFoundException('Thread không tồn tại');
    }

    return this.toThreadResponseDto(thread);
  }

  async updateThread(
    id: string,
    dto: UpdateThreadDto,
    currentUserId: string,
    currentUserRole: UserRole,
  ): Promise<DiscussionThread> {
    const thread = await this.threadRepository.findOne({
      where: { id },
      relations: ['created_by_user'],
    });

    if (!thread) {
      throw new NotFoundException('Thread không tồn tại');
    }

    const isOwner = thread.created_by === currentUserId;
    const isTeacherOrAdmin =
      currentUserRole === UserRole.TEACHER ||
      currentUserRole === UserRole.ADMIN;

    // Đổi pinned chỉ cho TEACHER/ADMIN
    if (dto.pinned !== undefined && !isTeacherOrAdmin) {
      throw new ForbiddenException(
        'Chỉ giảng viên hoặc admin mới được ghim thread',
      );
    }

    // Update title: owner hoặc teacher/admin
    if (!isOwner && !isTeacherOrAdmin) {
      throw new ForbiddenException(
        'Bạn không có quyền chỉnh sửa thread này',
      );
    }

    if (dto.title !== undefined) {
      thread.title = dto.title;
    }
    if (dto.pinned !== undefined) {
      thread.pinned = dto.pinned;
    }

    return this.threadRepository.save(thread);
  }

  async deleteThread(
    id: string,
    currentUserId: string,
    currentUserRole: UserRole,
  ): Promise<{ message: string }> {
    const thread = await this.threadRepository.findOne({
      where: { id },
    });

    if (!thread) {
      throw new NotFoundException('Thread không tồn tại');
    }

    const isOwner = thread.created_by === currentUserId;
    const isTeacherOrAdmin =
      currentUserRole === UserRole.TEACHER ||
      currentUserRole === UserRole.ADMIN;

    if (!isOwner && !isTeacherOrAdmin) {
      throw new ForbiddenException(
        'Bạn không có quyền xoá thread này',
      );
    }

    await this.threadRepository.delete(id);

    return { message: 'Xoá thread thành công' };
  }

  // ============================================================
  // POSTS
  // ============================================================

  async getPostsByThread(
    threadId: string,
  ): Promise<DiscussionPost[]> {
    const thread = await this.threadRepository.findOne({
      where: { id: threadId },
    });

    if (!thread) {
      throw new NotFoundException('Thread không tồn tại');
    }

    return this.postRepository.find({
      where: { thread_id: threadId, is_deleted: false },
      relations: ['created_by_user', 'parent'],
      order: { created_at: 'ASC' },
    });
  }

  async createPost(
    threadId: string,
    dto: CreatePostDto,
    currentUserId: string,
  ): Promise<DiscussionPost> {
    const thread = await this.threadRepository.findOne({
      where: { id: threadId },
    });

    if (!thread) {
      throw new NotFoundException('Thread không tồn tại');
    }

    const post = this.postRepository.create({
      content: dto.content,
      thread_id: threadId,
      parent_id: dto.parent_id ?? null,
      created_by: currentUserId,
    });

    return this.postRepository.save(post);
  }

  async updatePost(
    postId: string,
    dto: UpdatePostDto,
    currentUserId: string,
    currentUserRole: UserRole,
  ): Promise<DiscussionPost> {
    const post = await this.postRepository.findOne({
      where: { id: postId },
    });

    if (!post || post.is_deleted) {
      throw new NotFoundException('Post không tồn tại');
    }

    const isOwner = post.created_by === currentUserId;
    const isTeacherOrAdmin =
      currentUserRole === UserRole.TEACHER ||
      currentUserRole === UserRole.ADMIN;

    if (!isOwner && !isTeacherOrAdmin) {
      throw new ForbiddenException(
        'Bạn không có quyền sửa post này',
      );
    }

    post.content = dto.content;

    return this.postRepository.save(post);
  }

  async deletePost(
    postId: string,
    currentUserId: string,
    currentUserRole: UserRole,
  ): Promise<{ message: string }> {
    const post = await this.postRepository.findOne({
      where: { id: postId },
    });

    if (!post || post.is_deleted) {
      throw new NotFoundException('Post không tồn tại');
    }

    const isOwner = post.created_by === currentUserId;
    const isTeacherOrAdmin =
      currentUserRole === UserRole.TEACHER ||
      currentUserRole === UserRole.ADMIN;

    if (!isOwner && !isTeacherOrAdmin) {
      throw new ForbiddenException(
        'Bạn không có quyền xoá post này',
      );
    }

    // Soft delete
    post.is_deleted = true;
    await this.postRepository.save(post);

    return { message: 'Xoá post thành công' };
  }

  // ============================================================
  // PRIVATE HELPERS
  // ============================================================

  private buildThreadsBaseQuery(
    query: QueryThreadsDto,
  ): SelectQueryBuilder<DiscussionThread> {
    const qb = this.threadRepository
      .createQueryBuilder('thread')
      .leftJoinAndSelect('thread.course', 'course')
      .leftJoinAndSelect('thread.lesson', 'lesson')
      .leftJoinAndSelect('thread.created_by_user', 'creator')
      .leftJoinAndSelect('thread.posts', 'posts')
      .leftJoinAndSelect('posts.created_by_user', 'postAuthor');

    if (query.course_id) {
      qb.andWhere('thread.course_id = :courseId', {
        courseId: query.course_id,
      });
    }

    if (query.lesson_id) {
      qb.andWhere('thread.lesson_id = :lessonId', {
        lessonId: query.lesson_id,
      });
    }

    if (query.search) {
      const search = `%${query.search.toLowerCase()}%`;
      qb.andWhere('LOWER(thread.title) LIKE :search', { search });
    }

    qb.orderBy('thread.pinned', 'DESC')
      .addOrderBy('thread.created_at', 'DESC');

    return qb;
  }

  private toThreadResponseDto(
    thread: DiscussionThread,
  ): ThreadResponseDto {
    const posts = thread.posts ?? [];
    const postsCount = posts.filter((p) => !p.is_deleted).length;

    const latestPost = posts
      .filter((p) => !p.is_deleted)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime(),
      )[0];

    return {
      id: thread.id,
      title: thread.title,
      pinned: thread.pinned,
      created_at: thread.created_at,
      course: {
        id: thread.course?.id ?? thread.course_id,
        title: thread.course?.title ?? '',
      },
      lesson: thread.lesson
        ? {
            id: thread.lesson.id,
            title: (thread.lesson as any).title ?? '', // tuỳ entity Lesson
          }
        : undefined,
      created_by: {
        id: thread.created_by_user?.id ?? thread.created_by,
        full_name: thread.created_by_user?.full_name ?? '',
        avatar_url: thread.created_by_user?.avatar_url ?? '',
        role: thread.created_by_user?.role ?? '',
      },
      posts_count: postsCount,
      latest_post: latestPost
        ? {
            id: latestPost.id,
            content: latestPost.content,
            created_at: latestPost.created_at,
            created_by: {
              id:
                latestPost.created_by_user?.id ??
                latestPost.created_by,
              full_name:
                latestPost.created_by_user?.full_name ?? '',
            },
          }
        : undefined,
    };
  }
}
