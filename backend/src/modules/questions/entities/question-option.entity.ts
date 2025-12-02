// src/modules/quizzes/entities/question-option.entity.ts
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Question } from './question.entity';

@Entity('question_options')
export class QuestionOption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ default: false })
  is_correct: boolean;

  @Column()
  order_index: number;

  // ============================================
  // RELATIONS
  // ============================================

  @ManyToOne(() => Question, (question) => question.options, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'question_id' })
  question: Question;

  @Column()
  question_id: string;
}