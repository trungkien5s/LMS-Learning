// src/modules/enrollments/enrollments.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Delete,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';

import { EnrollmentsService, PaginatedResult } from './enrollments.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { QueryEnrollmentDto } from './dto/query-enrollment.dto';
import { EnrollmentResponseDto } from './dto/enrollment-response.dto';

import { JwtAuthGuard } from '@/auth/passport/jwt-auth.guard';
import { RolesGuard } from '@/auth/passport/roles.guard';
import { Roles } from '@/decorator/roles.decorator';
import { Public } from '@/decorator/customize';
import { UserRole } from '@/modules/users/entities/user.entity';

import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
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

@ApiTags('Enrollments')
@Controller('enrollments')
export class EnrollmentsController {
  constructor(
    private readonly enrollmentsService: EnrollmentsService,
  ) {}

  // ======================================================
  // STUDENT ENROLL COURSE
  // ======================================================
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enroll current student into a course' })
  @ApiBody({ type: CreateEnrollmentDto })
  async createEnrollment(
    @Req() req: RequestWithUser,
    @Body() dto: CreateEnrollmentDto,
  ): Promise<EnrollmentResponseDto> {
    const { userId } = req.user;
    const enrollment = await this.enrollmentsService.createEnrollment(
      dto,
      userId,
    );

    const full = await this.enrollmentsService.findById(
      enrollment.id,
      userId,
      req.user.role,
    );
    return full;
  }

  // ======================================================
  // LIST ENROLLMENTS (phân quyền theo role)
  // ======================================================
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'List enrollments (student: own, teacher: own courses, admin: all)',
  })
  @ApiQuery({ name: 'student_id', required: false })
  @ApiQuery({ name: 'course_id', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  async getEnrollments(
    @Req() req: RequestWithUser,
    @Query() query: QueryEnrollmentDto,
  ): Promise<PaginatedResult<EnrollmentResponseDto>> {
    const { userId, role } = req.user;
    return this.enrollmentsService.findEnrollments(
      query,
      userId,
      role,
    );
  }

  // ======================================================
  // GET DETAIL
  // ======================================================
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Get enrollment detail (student owner, teacher of course, or admin)',
  })
  @ApiParam({ name: 'id' })
  async getEnrollmentById(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
  ): Promise<EnrollmentResponseDto> {
    const { userId, role } = req.user;
    return this.enrollmentsService.findById(id, userId, role);
  }

  // ======================================================
  // UPDATE (progress / status)
  // ======================================================
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Update enrollment (student: own progress, teacher/admin: status & progress)',
  })
  @ApiParam({ name: 'id' })
  @ApiBody({ type: UpdateEnrollmentDto })
  async updateEnrollment(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: UpdateEnrollmentDto,
  ): Promise<EnrollmentResponseDto> {
    const { userId, role } = req.user;
    return this.enrollmentsService.updateEnrollment(
      id,
      dto,
      userId,
      role,
    );
  }

  // ======================================================
  // DELETE (only ADMIN)
  // ======================================================
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete enrollment (admin only)' })
  @ApiParam({ name: 'id' })
  async deleteEnrollment(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ): Promise<{ message: string }> {
    const { role } = req.user;
    return this.enrollmentsService.deleteEnrollment(id, role);
  }
}
