// src/modules/quizzes/questions.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Question } from './entities/question.entity';
import { QuestionOption } from './entities/question-option.entity';
import { Quiz } from '../quizzes/entities/quiz.entity';
import { QuestionsController } from './question.controller';
import { QuestionsService } from './question.service';


@Module({
  imports: [TypeOrmModule.forFeature([Question, QuestionOption, Quiz])],
  controllers: [QuestionsController],
  providers: [QuestionsService],
  exports: [QuestionsService],
})
export class QuestionsModule {}
