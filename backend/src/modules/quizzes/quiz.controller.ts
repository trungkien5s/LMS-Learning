// src/modules/quizzes/quizzes.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';


import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { QueryQuizzesDto } from './dto/query-quizzes.dto';
import { StartQuizDto } from './dto/start-quiz.dto';
import { SubmitAnswersDto } from './dto/submit-answers.dto';
import { QuizResultDto } from './dto/quiz-result.dto';

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
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { PaginatedResult, QuizzesService } from './quiz.service';
import { Quiz } from './entities/quiz.entity';

interface AuthUser {
  userId: string;
  role: UserRole;
  email: string;
}

interface RequestWithUser extends ExpressRequest {
  user: AuthUser;
}

@ApiTags('Quizzes')
@Controller('quizzes')
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  // ====================== PUBLIC QUIZZES =======================

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Danh sách quiz đã publish (filter theo lesson_id, phân trang)',
  })
  @ApiQuery({ name: 'lesson_id', required: false })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  async getPublicQuizzes(
    @Query() query: QueryQuizzesDto,
  ): Promise<PaginatedResult<Quiz>> {
    return this.quizzesService.getPublicQuizzes(query);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Chi tiết 1 quiz đã publish' })
  @ApiParam({ name: 'id' })
  async getPublicQuiz(@Param('id') id: string) {
    return this.quizzesService.getPublicQuizById(id);
  }

  // ====================== MANAGE QUIZZES =======================

  @Post('lesson/:lessonId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo quiz mới cho 1 bài học' })
  @ApiParam({ name: 'lessonId' })
  @ApiBody({ type: CreateQuizDto })
  async createQuiz(
    @Param('lessonId') lessonId: string,
    @Req() req: RequestWithUser,
    @Body() dto: CreateQuizDto,
  ) {
    const { userId, role } = req.user;
    return this.quizzesService.createQuiz(
      lessonId,
      dto,
      userId,
      role,
    );
  }

  @Get('manage/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Teacher/Admin xem quiz (kể cả chưa publish)' })
  @ApiParam({ name: 'id' })
  async getQuizForManage(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ) {
    const { userId, role } = req.user;
    return this.quizzesService.getQuizForManage(id, userId, role);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật quiz' })
  @ApiParam({ name: 'id' })
  @ApiBody({ type: UpdateQuizDto })
  async updateQuiz(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @Body() dto: UpdateQuizDto,
  ) {
    const { userId, role } = req.user;
    return this.quizzesService.updateQuiz(id, dto, userId, role);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xoá quiz' })
  @ApiParam({ name: 'id' })
  async deleteQuiz(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ) {
    const { userId, role } = req.user;
    return this.quizzesService.deleteQuiz(id, userId, role);
  }

  // ====================== QUIZ ATTEMPTS =======================

  @Post('start')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Bắt đầu làm quiz – trả về attempt_id',
  })
  @ApiBody({ type: StartQuizDto })
  async startQuiz(
    @Req() req: RequestWithUser,
    @Body() dto: StartQuizDto,
  ) {
    const { userId } = req.user;
    return this.quizzesService.startQuiz(dto, userId);
  }

  @Post('attempts/:attemptId/submit')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Nộp bài quiz và nhận kết quả' })
  @ApiParam({ name: 'attemptId' })
  @ApiBody({ type: SubmitAnswersDto })
  async submitQuiz(
    @Param('attemptId') attemptId: string,
    @Req() req: RequestWithUser,
    @Body() dto: SubmitAnswersDto,
  ): Promise<QuizResultDto> {
    const { userId } = req.user;
    return this.quizzesService.submitAnswers(
      attemptId,
      userId,
      dto,
    );
  }

  @Get('attempts/:attemptId/result')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Xem kết quả lượt làm bài (student owner, teacher của khoá hoặc admin)',
  })
  @ApiParam({ name: 'attemptId' })
  async getAttemptResult(
    @Param('attemptId') attemptId: string,
    @Req() req: RequestWithUser,
  ): Promise<QuizResultDto> {
    const { userId, role } = req.user;
    return this.quizzesService.getAttemptResult(
      attemptId,
      userId,
      role,
    );
  }
}
