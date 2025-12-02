// src/modules/quizzes/questions.service.ts
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Question, QuestionType } from './entities/question.entity';
import { QuestionOption } from './entities/question-option.entity';

import { CreateQuestionDto, CreateOptionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { UserRole } from '@/modules/users/entities/user.entity';
import { Quiz } from '../quizzes/entities/quiz.entity';

@Injectable()
export class QuestionsService {
  constructor(
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
    @InjectRepository(QuestionOption)
    private readonly optionRepository: Repository<QuestionOption>,
    @InjectRepository(Quiz)
    private readonly quizRepository: Repository<Quiz>,
  ) {}

  // ======================================================
  // HELPER: check quyền quản lý quiz
  // ======================================================
  private async ensureCanManageQuiz(
    quizId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<Quiz> {
    const quiz = await this.quizRepository.findOne({
      where: { id: quizId },
      relations: ['lesson', 'lesson.course'],
    });

    if (!quiz) {
      throw new NotFoundException('Quiz không tồn tại');
    }

    const teacherId = (quiz as any).lesson?.course?.teacher_id;
    const isAdmin = userRole === UserRole.ADMIN;
    const isOwner = teacherId && teacherId === userId;

    if (!isAdmin && !isOwner) {
      throw new ForbiddenException(
        'Bạn không có quyền quản lý câu hỏi của quiz này',
      );
    }

    return quiz;
  }

  private async getNextOrderIndex(quizId: string): Promise<number> {
    const maxQuestion = await this.questionRepository.findOne({
      where: { quiz_id: quizId },
      order: { order_index: 'DESC' },
    });

    if (!maxQuestion) return 1;
    return maxQuestion.order_index + 1;
  }

  private validateOptionsLogic(
    type: QuestionType,
    options: CreateOptionDto[],
  ): void {
    const correctCount = options.filter((o) => o.is_correct).length;

    if (options.length < 2) {
      throw new BadRequestException('Phải có ít nhất 2 đáp án');
    }

    switch (type) {
      case QuestionType.MCQ_SINGLE:
        if (correctCount !== 1) {
          throw new BadRequestException(
            'MCQ_SINGLE phải có đúng 1 đáp án đúng',
          );
        }
        break;
      case QuestionType.MCQ_MULTI:
        if (correctCount < 1) {
          throw new BadRequestException(
            'MCQ_MULTI phải có ít nhất 1 đáp án đúng',
          );
        }
        break;
      case QuestionType.TRUE_FALSE:
        if (options.length !== 2) {
          throw new BadRequestException(
            'TRUE_FALSE phải có đúng 2 đáp án (True/False)',
          );
        }
        if (correctCount !== 1) {
          throw new BadRequestException(
            'TRUE_FALSE phải có đúng 1 đáp án đúng',
          );
        }
        break;
      default:
        break;
    }
  }

  private buildOptionsEntities(
    questionId: string | null,
    options: CreateOptionDto[],
  ): QuestionOption[] {
    return options.map((opt, index) =>
      this.optionRepository.create({
        content: opt.content,
        is_correct: opt.is_correct,
        order_index: index + 1,
        question_id: questionId ?? undefined,
      }),
    );
  }

  // ======================================================
  // CREATE
  // ======================================================
  async createQuestion(
    quizId: string,
    dto: CreateQuestionDto,
    userId: string,
    userRole: UserRole,
  ): Promise<Question> {
    await this.ensureCanManageQuiz(quizId, userId, userRole);

    this.validateOptionsLogic(dto.type, dto.options);

    const orderIndex =
      dto.order_index ?? (await this.getNextOrderIndex(quizId));

    const question = this.questionRepository.create({
      content: dto.content,
      type: dto.type,
      points: dto.points,
      order_index: orderIndex,
      quiz_id: quizId,
      options: this.buildOptionsEntities(null, dto.options),
    });

    // cascade: true trên options → save question sẽ save luôn options
    return this.questionRepository.save(question);
  }

  // ======================================================
  // READ
  // ======================================================
  async getQuestionsByQuiz(quizId: string): Promise<Question[]> {
    return this.questionRepository.find({
      where: { quiz_id: quizId },
      relations: ['options'],
      order: {
        order_index: 'ASC',
        options: {
          order_index: 'ASC',
        },
      },
    });
  }

  async getQuestionById(
    quizId: string,
    questionId: string,
  ): Promise<Question> {
    const question = await this.questionRepository.findOne({
      where: { id: questionId, quiz_id: quizId },
      relations: ['options'],
      order: {
        options: {
          order_index: 'ASC',
        },
      } as any,
    });

    if (!question) {
      throw new NotFoundException('Câu hỏi không tồn tại');
    }

    return question;
  }

  // ======================================================
  // UPDATE
  // ======================================================
  async updateQuestion(
    quizId: string,
    questionId: string,
    dto: UpdateQuestionDto,
    userId: string,
    userRole: UserRole,
  ): Promise<Question> {
    await this.ensureCanManageQuiz(quizId, userId, userRole);

    const question = await this.questionRepository.findOne({
      where: { id: questionId, quiz_id: quizId },
      relations: ['options'],
    });

    if (!question) {
      throw new NotFoundException('Câu hỏi không tồn tại');
    }

    const newType = dto.type ?? question.type;
    const newOptions =
      dto.options ?? question.options?.map((o) => ({
        content: o.content,
        is_correct: o.is_correct,
      }));

    if (!newOptions || newOptions.length < 2) {
      throw new BadRequestException('Phải có ít nhất 2 đáp án');
    }

    this.validateOptionsLogic(newType, newOptions);

    if (dto.content !== undefined) {
      question.content = dto.content;
    }
    if (dto.type !== undefined) {
      question.type = dto.type;
    }
    if (dto.points !== undefined) {
      question.points = dto.points;
    }
    if (dto.order_index !== undefined) {
      question.order_index = dto.order_index;
    }

    if (dto.options) {
      // Xoá options cũ & tạo lại options mới
      await this.optionRepository.delete({ question_id: question.id });

      question.options = this.buildOptionsEntities(
        question.id,
        dto.options,
      );
    }

    return this.questionRepository.save(question);
  }

  // ======================================================
  // DELETE
  // ======================================================
  async deleteQuestion(
    quizId: string,
    questionId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<{ message: string }> {
    await this.ensureCanManageQuiz(quizId, userId, userRole);

    const question = await this.questionRepository.findOne({
      where: { id: questionId, quiz_id: quizId },
    });

    if (!question) {
      throw new NotFoundException('Câu hỏi không tồn tại');
    }

    await this.questionRepository.delete(question.id);

    return { message: 'Xoá câu hỏi thành công' };
  }
}
