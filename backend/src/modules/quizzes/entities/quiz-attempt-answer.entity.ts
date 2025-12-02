import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { QuizAttempt } from './quiz-attempt.entity';
import { Question } from '@/modules/questions/entities/question.entity';
import { QuestionOption } from '@/modules/questions/entities/question-option.entity';


@Entity('quiz_attempt_answers')
export class QuizAttemptAnswer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', nullable: true })
  answer_text: string;

  @Column({ nullable: true })
  is_correct: boolean;

  // ============================================
  // RELATIONS
  // ============================================

  @ManyToOne(() => QuizAttempt, (attempt) => attempt.answers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'attempt_id' })
  attempt: QuizAttempt;

  @Column()
  attempt_id: string;

  @ManyToOne(() => Question, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question: Question;

  @Column()
  question_id: string;

  @ManyToOne(() => QuestionOption, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'option_id' })
  option: QuestionOption;

  @Column({ nullable: true })
  option_id: string;
}