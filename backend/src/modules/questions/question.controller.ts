// src/modules/quizzes/questions.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';


import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';

import { JwtAuthGuard } from '@/auth/passport/jwt-auth.guard';
import { RolesGuard } from '@/auth/passport/roles.guard';
import { Roles } from '@/decorator/roles.decorator';
import { Public } from '@/decorator/customize';
import { UserRole } from '@/modules/users/entities/user.entity';

import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { QuestionsService } from './question.service';

interface AuthUser {
  userId: string;
  role: UserRole;
  email: string;
}

interface RequestWithUser extends ExpressRequest {
  user: AuthUser;
}

@ApiTags('Quiz Questions')
@Controller('quizzes/:quizId/questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  // ========================= PUBLIC READ =========================

  @Get()
  @Public()
  @ApiOperation({ summary: 'Danh sách câu hỏi của quiz (kèm options)' })
  @ApiParam({ name: 'quizId' })
  async getQuestions(
    @Param('quizId') quizId: string,
  ) {
    return this.questionsService.getQuestionsByQuiz(quizId);
  }

  @Get(':questionId')
  @Public()
  @ApiOperation({ summary: 'Chi tiết 1 câu hỏi của quiz (kèm options)' })
  @ApiParam({ name: 'quizId' })
  @ApiParam({ name: 'questionId' })
  async getQuestion(
    @Param('quizId') quizId: string,
    @Param('questionId') questionId: string,
  ) {
    return this.questionsService.getQuestionById(quizId, questionId);
  }

  // ===================== MANAGE (TEACHER/ADMIN) =====================

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo câu hỏi mới cho quiz' })
  @ApiParam({ name: 'quizId' })
  @ApiBody({ type: CreateQuestionDto })
  async createQuestion(
    @Param('quizId') quizId: string,
    @Req() req: RequestWithUser,
    @Body() dto: CreateQuestionDto,
  ) {
    const { userId, role } = req.user;
    return this.questionsService.createQuestion(
      quizId,
      dto,
      userId,
      role,
    );
  }

  @Patch(':questionId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật 1 câu hỏi của quiz' })
  @ApiParam({ name: 'quizId' })
  @ApiParam({ name: 'questionId' })
  @ApiBody({ type: UpdateQuestionDto })
  async updateQuestion(
    @Param('quizId') quizId: string,
    @Param('questionId') questionId: string,
    @Req() req: RequestWithUser,
    @Body() dto: UpdateQuestionDto,
  ) {
    const { userId, role } = req.user;
    return this.questionsService.updateQuestion(
      quizId,
      questionId,
      dto,
      userId,
      role,
    );
  }

  @Delete(':questionId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xoá 1 câu hỏi khỏi quiz' })
  @ApiParam({ name: 'quizId' })
  @ApiParam({ name: 'questionId' })
  async deleteQuestion(
    @Param('quizId') quizId: string,
    @Param('questionId') questionId: string,
    @Req() req: RequestWithUser,
  ) {
    const { userId, role } = req.user;
    return this.questionsService.deleteQuestion(
      quizId,
      questionId,
      userId,
      role,
    );
  }
}
