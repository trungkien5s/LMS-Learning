// src/modules/quizzes/quizzes.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Quiz } from './entities/quiz.entity';
import { QuizAttempt } from './entities/quiz-attempt.entity';
import { QuizAttemptAnswer } from './entities/quiz-attempt-answer.entity';

import { Lesson } from '@/modules/lessons/entities/lesson.entity';
import { Course } from '@/modules/courses/entities/course.entity';
import { QuizzesService } from './quiz.service';
import { QuizzesController } from './quiz.controller';
import { Question } from '../questions/entities/question.entity';
import { QuestionOption } from '../questions/entities/question-option.entity';



@Module({
  imports: [
    TypeOrmModule.forFeature([
      Quiz,
      QuizAttempt,
      QuizAttemptAnswer,
      Question,
      QuestionOption,
      Lesson,
      Course,
    ]),
  ],
  controllers: [QuizzesController],
  providers: [QuizzesService],
  exports: [QuizzesService],
})
export class QuizzesModule {}
