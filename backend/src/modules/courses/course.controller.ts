// src/modules/courses/courses.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Patch,
  Delete,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';

import { Course } from './entities/course.entity';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { QueryCoursesDto } from './dto/query-courses.dto';

import { UserRole } from '@/modules/users/entities/user.entity';
import { CoursesService, PaginatedResult } from './course.service';
import { JwtAuthGuard } from '@/auth/passport/jwt-auth.guard';
import { RolesGuard } from '@/auth/passport/roles.guard';
import { Roles } from '@/decorator/roles.decorator';

interface AuthUser {
  userId: string;
  role: UserRole;
}

interface AuthenticatedRequest extends Request {
  user: AuthUser;
}

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  // ============================================
  // PUBLIC
  // ============================================

  @Get()
  async getPublicCourses(
    @Query() query: QueryCoursesDto,
  ): Promise<PaginatedResult<Course>> {
    return this.coursesService.findPublic(query);
  }

  @Get(':slug')
  async getCourseBySlug(
    @Param('slug') slug: string,
  ): Promise<Course> {
    return this.coursesService.findBySlug(slug);
  }

  // ============================================
  // TEACHER / ADMIN
  // ============================================

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @Post()
  async createCourse(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateCourseDto,
  ): Promise<Course> {
    const { userId } = req.user;
    return this.coursesService.create(dto, userId);
  }

  // danh sách cho quản lý (có thể xem cả DRAFT, ARCHIVED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @Get('manage/list')
  async getManageCourses(
    @Query() query: QueryCoursesDto,
  ): Promise<PaginatedResult<Course>> {
    return this.coursesService.findForManage(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @Get('manage/:id')
  async getCourseForManage(
    @Param('id') id: string,
  ): Promise<Course> {
    return this.coursesService.findOneById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @Patch(':id')
  async updateCourse(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateCourseDto,
  ): Promise<Course> {
    const { userId, role } = req.user;
    return this.coursesService.update(id, dto, userId, role);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @Delete(':id')
  async deleteCourse(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ message: string }> {
    const { userId, role } = req.user;
    await this.coursesService.remove(id, userId, role);
    return { message: 'Xoá khoá học thành công' };
  }
}
