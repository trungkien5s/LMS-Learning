// src/modules/lessons/lessons.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';

import { LessonsService } from './lessons.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { ReorderLessonsDto } from './dto/reorder-lessons.dto';
import { JwtAuthGuard } from '@/auth/passport/jwt-auth.guard';
import { RolesGuard } from '@/auth/passport/roles.guard';
import { Roles } from '@/decorator/roles.decorator';
import { Public } from '@/decorator/customize';
import { UserRole } from '@/modules/users/entities/user.entity';

import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';

interface AuthUser {
  userId: string;
  role: UserRole;
  email: string;
}

interface RequestWithUser extends ExpressRequest {
  user: AuthUser;
}

@ApiTags('Lessons')
@Controller('courses/:courseId/lessons')
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  // ===================== PUBLIC GET ======================

  @Get()
  @Public()
  @ApiOperation({ summary: 'Danh sách bài học của khoá học' })
  @ApiParam({ name: 'courseId' })
  async getLessonsByCourse(
    @Param('courseId') courseId: string,
  ) {
    return this.lessonsService.findLessonsByCourse(courseId);
  }

  @Get(':lessonId')
  @Public()
  @ApiOperation({ summary: 'Chi tiết một bài học trong khoá học' })
  @ApiParam({ name: 'courseId' })
  @ApiParam({ name: 'lessonId' })
  async getLesson(
    @Param('courseId') courseId: string,
    @Param('lessonId') lessonId: string,
  ) {
    return this.lessonsService.findLessonInCourse(courseId, lessonId);
  }

  // ================== MANAGE (TEACHER/ADMIN) ==================

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo bài học mới cho khoá học' })
  @ApiParam({ name: 'courseId' })
  @ApiBody({ type: CreateLessonDto })
  async createLesson(
    @Param('courseId') courseId: string,
    @Req() req: RequestWithUser,
    @Body() dto: CreateLessonDto,
  ) {
    const { userId, role } = req.user;
    return this.lessonsService.createLesson(
      courseId,
      dto,
      userId,
      role,
    );
  }

  @Patch(':lessonId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật bài học trong khoá học' })
  @ApiParam({ name: 'courseId' })
  @ApiParam({ name: 'lessonId' })
  @ApiBody({ type: UpdateLessonDto })
  async updateLesson(
    @Param('courseId') courseId: string,
    @Param('lessonId') lessonId: string,
    @Req() req: RequestWithUser,
    @Body() dto: UpdateLessonDto,
  ) {
    const { userId, role } = req.user;
    return this.lessonsService.updateLesson(
      courseId,
      lessonId,
      dto,
      userId,
      role,
    );
  }

  @Delete(':lessonId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xoá bài học khỏi khoá học' })
  @ApiParam({ name: 'courseId' })
  @ApiParam({ name: 'lessonId' })
  async deleteLesson(
    @Param('courseId') courseId: string,
    @Param('lessonId') lessonId: string,
    @Req() req: RequestWithUser,
  ) {
    const { userId, role } = req.user;
    return this.lessonsService.deleteLesson(
      courseId,
      lessonId,
      userId,
      role,
    );
  }

  @Patch('reorder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Cập nhật thứ tự các bài học trong khoá học',
  })
  @ApiParam({ name: 'courseId' })
  @ApiBody({ type: ReorderLessonsDto })
  async reorderLessons(
    @Param('courseId') courseId: string,
    @Req() req: RequestWithUser,
    @Body() dto: ReorderLessonsDto,
  ) {
    const { userId, role } = req.user;
    return this.lessonsService.reorderLessons(
      courseId,
      dto,
      userId,
      role,
    );
  }
}
