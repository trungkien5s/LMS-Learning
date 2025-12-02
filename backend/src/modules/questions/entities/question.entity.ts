// src/modules/quizzes/entities/question.entity.ts
import { Quiz } from '@/modules/quizzes/entities/quiz.entity';
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { QuestionOption } from './question-option.entity';


export enum QuestionType {
  MCQ_SINGLE = 'MCQ_SINGLE',
  MCQ_MULTI = 'MCQ_MULTI',
  TRUE_FALSE = 'TRUE_FALSE',
}

@Entity('questions')
export class Question {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'enum',
    enum: QuestionType,
  })
  type: QuestionType;

  @Column({ default: 1 })
  points: number;

  @Column()
  order_index: number;

  // ============================================
  // RELATIONS
  // ============================================

  @ManyToOne(() => Quiz, (quiz) => quiz.questions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quiz_id' })
  quiz: Quiz;

  @Column()
  quiz_id: string;

  @OneToMany(() => QuestionOption, (option) => option.question, {
    cascade: true,
  })
  options: QuestionOption[];
}
