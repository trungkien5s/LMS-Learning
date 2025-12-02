// src/modules/quizzes/quizzes.service.ts
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

import { Quiz } from './entities/quiz.entity';
import {
  QuizAttempt,
  QuizAttemptStatus,
} from './entities/quiz-attempt.entity';
import { QuizAttemptAnswer } from './entities/quiz-attempt-answer.entity';

import { Lesson } from '@/modules/lessons/entities/lesson.entity';
import { Course } from '@/modules/courses/entities/course.entity';

import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { QueryQuizzesDto } from './dto/query-quizzes.dto';
import { StartQuizDto } from './dto/start-quiz.dto';
import { SubmitAnswersDto } from './dto/submit-answers.dto';
import { QuizResultDto } from './dto/quiz-result.dto';

import { UserRole } from '@/modules/users/entities/user.entity';
import { Question, QuestionType } from '../questions/entities/question.entity';
import { QuestionOption } from '../questions/entities/question-option.entity';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class QuizzesService {
  constructor(
    @InjectRepository(Quiz)
    private readonly quizRepository: Repository<Quiz>,
    @InjectRepository(QuizAttempt)
    private readonly attemptRepository: Repository<QuizAttempt>,
    @InjectRepository(QuizAttemptAnswer)
    private readonly attemptAnswerRepository: Repository<QuizAttemptAnswer>,
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
    @InjectRepository(QuestionOption)
    private readonly optionRepository: Repository<QuestionOption>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) {}

  // ======================================================
  // HELPERS: PERMISSION & UTIL
  // ======================================================

  private async ensureCanManageLesson(
    lessonId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<Lesson> {
    const lesson = await this.lessonRepository.findOne({
      where: { id: lessonId },
      relations: ['course'],
    });

    if (!lesson) {
      throw new NotFoundException('Bài học không tồn tại');
    }

    const course = lesson.course;
    if (!course) {
      throw new NotFoundException('Khoá học của bài học không tồn tại');
    }

    const isOwner = (course as any).teacher_id === userId;
    const isAdmin = userRole === UserRole.ADMIN;

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException(
        'Bạn không có quyền quản lý quiz của bài học này',
      );
    }

    return lesson;
  }

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

    const teacherId = (quiz.lesson as any)?.course?.teacher_id;
    const isOwner = teacherId === userId;
    const isAdmin = userRole === UserRole.ADMIN;

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException(
        'Bạn không có quyền quản lý quiz này',
      );
    }

    return quiz;
  }

  private buildPublicQuizQuery(
    query: QueryQuizzesDto,
  ): SelectQueryBuilder<Quiz> {
    const qb = this.quizRepository
      .createQueryBuilder('quiz')
      .leftJoinAndSelect('quiz.lesson', 'lesson');

    // chỉ trả quiz đã publish
    qb.where('quiz.is_published = :published', { published: true });

    if (query.lesson_id) {
      qb.andWhere('quiz.lesson_id = :lessonId', {
        lessonId: query.lesson_id,
      });
    }

    qb.orderBy('quiz.created_at', 'DESC');

    return qb;
  }

  private async loadQuizWithQuestions(quizId: string): Promise<Quiz> {
    const quiz = await this.quizRepository.findOne({
      where: { id: quizId },
      relations: ['questions', 'questions.options'],
      order: {
        questions: {
          order_index: 'ASC',
        },
      } as any,
    });

    if (!quiz) {
      throw new NotFoundException('Quiz không tồn tại');
    }

    return quiz;
  }

  // ======================================================
  // QUIZ CRUD
  // ======================================================

  async createQuiz(
    lessonId: string,
    dto: CreateQuizDto,
    userId: string,
    userRole: UserRole,
  ): Promise<Quiz> {
    await this.ensureCanManageLesson(lessonId, userId, userRole);

    const quiz = this.quizRepository.create({
      title: dto.title,
      description: dto.description ?? null,
      time_limit_minutes: dto.time_limit_minutes ?? null,
      is_published: dto.is_published ?? false,
      lesson_id: lessonId,
    });

    return this.quizRepository.save(quiz);
  }

  async getPublicQuizzes(
    query: QueryQuizzesDto,
  ): Promise<PaginatedResult<Quiz>> {
    const qb = this.buildPublicQuizQuery(query);

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const [rows, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getPublicQuizById(id: string): Promise<Quiz> {
    const quiz = await this.quizRepository.findOne({
      where: { id },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz không tồn tại');
    }

    if (!quiz.is_published) {
      throw new ForbiddenException('Quiz này chưa được public');
    }

    return quiz;
  }

  async getQuizForManage(id: string, userId: string, userRole: UserRole) {
    const quiz = await this.ensureCanManageQuiz(id, userId, userRole);
    return quiz;
  }

  async updateQuiz(
    id: string,
    dto: UpdateQuizDto,
    userId: string,
    userRole: UserRole,
  ): Promise<Quiz> {
    const quiz = await this.ensureCanManageQuiz(id, userId, userRole);

    if (dto.title !== undefined) {
      quiz.title = dto.title;
    }
    if (dto.description !== undefined) {
      quiz.description = dto.description;
    }
    if (dto.time_limit_minutes !== undefined) {
      quiz.time_limit_minutes = dto.time_limit_minutes;
    }
    if (dto.is_published !== undefined) {
      quiz.is_published = dto.is_published;
    }

    return this.quizRepository.save(quiz);
  }

  async deleteQuiz(
    id: string,
    userId: string,
    userRole: UserRole,
  ): Promise<{ message: string }> {
    await this.ensureCanManageQuiz(id, userId, userRole);

    const quiz = await this.quizRepository.findOne({ where: { id } });
    if (!quiz) {
      throw new NotFoundException('Quiz không tồn tại');
    }

    await this.quizRepository.delete(id);

    return { message: 'Xoá quiz thành công' };
  }

  // ======================================================
  // QUIZ ATTEMPTS
  // ======================================================

  async startQuiz(
    dto: StartQuizDto,
    studentId: string,
  ): Promise<{ attempt_id: string; started_at: Date; time_limit_minutes: number | null }> {
    const quiz = await this.quizRepository.findOne({
      where: { id: dto.quiz_id },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz không tồn tại');
    }

    if (!quiz.is_published) {
      throw new ForbiddenException('Quiz này chưa được public');
    }

    // xác định attempt_no
    const existingAttempts = await this.attemptRepository.count({
      where: {
        quiz_id: dto.quiz_id,
        student_id: studentId,
      },
    });

    const attempt = this.attemptRepository.create({
      quiz_id: dto.quiz_id,
      student_id: studentId,
      status: QuizAttemptStatus.IN_PROGRESS,
      attempt_no: existingAttempts + 1,
    });

    const saved = await this.attemptRepository.save(attempt);

    return {
      attempt_id: saved.id,
      started_at: saved.started_at,
      time_limit_minutes: quiz.time_limit_minutes ?? null,
    };
  }

  async submitAnswers(
    attemptId: string,
    studentId: string,
    dto: SubmitAnswersDto,
  ): Promise<QuizResultDto> {
    const attempt = await this.attemptRepository.findOne({
      where: { id: attemptId },
    });

    if (!attempt) {
      throw new NotFoundException('Lượt làm bài không tồn tại');
    }

    if (attempt.student_id !== studentId) {
      throw new ForbiddenException(
        'Bạn không có quyền nộp bài cho lượt làm này',
      );
    }

    if (attempt.status === QuizAttemptStatus.SUBMITTED) {
      throw new BadRequestException('Lượt làm bài đã được nộp trước đó');
    }

    const quiz = await this.loadQuizWithQuestions(attempt.quiz_id);

    if (!quiz.questions || quiz.questions.length === 0) {
      throw new BadRequestException('Quiz không có câu hỏi nào');
    }

    // Xoá answer cũ (nếu có) rồi ghi mới
    await this.attemptAnswerRepository.delete({ attempt_id: attempt.id });

    // Map questionId -> question
    const questionMap = new Map<string, Question>();
    quiz.questions.forEach((q) => {
      questionMap.set(q.id, q);
    });

    // Lưu answers từng câu (MCQ_MULTI sẽ tạo nhiều dòng)
    const answerEntities: QuizAttemptAnswer[] = [];

    for (const ans of dto.answers) {
      const question = questionMap.get(ans.question_id);
      if (!question) {
        throw new BadRequestException(
          `Câu hỏi không thuộc quiz: ${ans.question_id}`,
        );
      }

      const options = question.options ?? [];

      if (question.type === QuestionType.MCQ_SINGLE || question.type === QuestionType.TRUE_FALSE) {
        if (!ans.option_id) {
          // không chọn gì -> bỏ qua, xem như sai
          continue;
        }

        const option = options.find((o) => o.id === ans.option_id);
        if (!option) {
          throw new BadRequestException(
            `Option không thuộc câu hỏi: ${ans.option_id}`,
          );
        }

        const isCorrect = option.is_correct;

        const answerEntity = this.attemptAnswerRepository.create({
          attempt_id: attempt.id,
          question_id: question.id,
          option_id: option.id,
          is_correct: isCorrect,
        });

        answerEntities.push(answerEntity);
      } else if (question.type === QuestionType.MCQ_MULTI) {
        const selectedIds = ans.option_ids ?? [];

        if (selectedIds.length === 0) {
          // không chọn -> xem như sai, nhưng vẫn có thể lưu 0 answer hoặc bỏ qua
          continue;
        }

        const correctOptions = options.filter((o) => o.is_correct);
        const correctIds = correctOptions.map((o) => o.id).sort();

        const normalizedSelected = [...selectedIds].sort();

        const allExist = normalizedSelected.every((id) =>
          options.some((o) => o.id === id),
        );
        if (!allExist) {
          throw new BadRequestException(
            `Có option không thuộc câu hỏi trong MCQ_MULTI`,
          );
        }

        const isCorrect =
          normalizedSelected.length === correctIds.length &&
          normalizedSelected.every((id, idx) => id === correctIds[idx]);

        // Tạo 1 record cho mỗi option chọn
        for (const optionId of normalizedSelected) {
          const answerEntity = this.attemptAnswerRepository.create({
            attempt_id: attempt.id,
            question_id: question.id,
            option_id: optionId,
            is_correct: isCorrect, // tất cả cùng flag đúng/sai theo toàn bộ combo
          });
          answerEntities.push(answerEntity);
        }
      } else {
        // Các loại khác (text...) – tạm thời chỉ lưu answer_text, chưa chấm điểm
        if (ans.answer_text) {
          const answerEntity = this.attemptAnswerRepository.create({
            attempt_id: attempt.id,
            question_id: question.id,
            answer_text: ans.answer_text,
            is_correct: null,
          });
          answerEntities.push(answerEntity);
        }
      }
    }

    await this.attemptAnswerRepository.save(answerEntities);

    // Tính điểm
    const result = await this.calculateResult(attempt.id);

    // cập nhật attempt
    attempt.completed_at = new Date();
    attempt.status = QuizAttemptStatus.SUBMITTED;
    attempt.score = result.score;

    await this.attemptRepository.save(attempt);

    return result;
  }

  async getAttemptResult(
    attemptId: string,
    currentUserId: string,
    currentUserRole: UserRole,
  ): Promise<QuizResultDto> {
    const attempt = await this.attemptRepository.findOne({
      where: { id: attemptId },
      relations: ['quiz', 'quiz.lesson', 'quiz.lesson.course'],
    });

    if (!attempt) {
      throw new NotFoundException('Lượt làm bài không tồn tại');
    }

    const isOwner = attempt.student_id === currentUserId;
    const isAdmin = currentUserRole === UserRole.ADMIN;
    const teacherId = (attempt.quiz.lesson as any)?.course?.teacher_id;
    const isTeacherOwner = teacherId === currentUserId;

    if (!isOwner && !isAdmin && !isTeacherOwner) {
      throw new ForbiddenException(
        'Bạn không có quyền xem kết quả lượt làm bài này',
      );
    }

    return this.calculateResult(attempt.id);
  }

  // ======================================================
  // CALCULATE RESULT
  // ======================================================

  private async calculateResult(attemptId: string): Promise<QuizResultDto> {
    const attempt = await this.attemptRepository.findOne({
      where: { id: attemptId },
      relations: ['quiz'],
    });

    if (!attempt) {
      throw new NotFoundException('Lượt làm bài không tồn tại');
    }

    const quiz = await this.loadQuizWithQuestions(attempt.quiz_id);

    const answers = await this.attemptAnswerRepository.find({
      where: { attempt_id: attempt.id },
      relations: ['question', 'option'],
    });

    // Tổng điểm của quiz = tổng points câu hỏi
    const totalPoints = (quiz.questions ?? []).reduce(
      (sum, q) => sum + (q.points ?? 0),
      0,
    );

    let totalScore = 0;

    const answersByQuestion = new Map<string, QuizAttemptAnswer[]>();
    answers.forEach((ans) => {
      const arr = answersByQuestion.get(ans.question_id) ?? [];
      arr.push(ans);
      answersByQuestion.set(ans.question_id, arr);
    });

    const answerDetails: QuizResultDto['answers'] = [];

    for (const question of quiz.questions ?? []) {
      const questionAnswers = answersByQuestion.get(question.id) ?? [];

      const questionOptions = question.options ?? [];
      const correctOptions = questionOptions.filter((o) => o.is_correct);
      const correctOptionIds = correctOptions.map((o) => o.id);

      let isCorrect = false;
      let pointsEarned = 0;

      let yourAnswer: string | string[] = [];
      let correctAnswer: string | string[] = [];

      if (question.type === QuestionType.MCQ_SINGLE || question.type === QuestionType.TRUE_FALSE) {
        const chosen = questionAnswers[0];
        const chosenOption = chosen?.option;

        if (chosenOption) {
          yourAnswer = chosenOption.content;
        } else {
          yourAnswer = '';
        }

        const correctOption = correctOptions[0];
        correctAnswer = correctOption ? correctOption.content : '';

        isCorrect = !!chosen?.is_correct;
        pointsEarned = isCorrect ? question.points : 0;
      } else if (question.type === QuestionType.MCQ_MULTI) {
        const chosenOptions = questionAnswers
          .map((a) => a.option)
          .filter((o): o is QuestionOption => !!o);

        yourAnswer = chosenOptions.map((o) => o.content);
        correctAnswer = correctOptions.map((o) => o.content);

        // is_correct đã được set đồng nhất trên từng answer ở submitAnswers
        isCorrect = questionAnswers[0]?.is_correct ?? false;
        pointsEarned = isCorrect ? question.points : 0;
      } else {
        const textAnswer = questionAnswers[0]?.answer_text ?? '';
        yourAnswer = textAnswer;
        correctAnswer = '';
        // text – tạm thời cho 0 (chấm tay sau)
        isCorrect = false;
        pointsEarned = 0;
      }

      totalScore += pointsEarned;

      answerDetails.push({
        question_id: question.id,
        question_content: question.content,
        question_points: question.points,
        your_answer: yourAnswer,
        correct_answer: correctAnswer,
        is_correct: isCorrect,
        points_earned: pointsEarned,
      });
    }

    const percentage =
      totalPoints > 0 ? (totalScore / totalPoints) * 100 : 0;

    const timeTakenSeconds =
      attempt.completed_at && attempt.started_at
        ? Math.floor(
            (attempt.completed_at.getTime() -
              attempt.started_at.getTime()) /
              1000,
          )
        : 0;

    return {
      attempt_id: attempt.id,
      quiz_id: quiz.id,
      quiz_title: quiz.title,
      score: Number(totalScore.toFixed(2)),
      total_points: totalPoints,
      percentage: Number(percentage.toFixed(2)),
      status: attempt.status,
      started_at: attempt.started_at,
      completed_at: attempt.completed_at,
      time_taken_seconds: timeTakenSeconds,
      answers: answerDetails,
    };
  }
}
