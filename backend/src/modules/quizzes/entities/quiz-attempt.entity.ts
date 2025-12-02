// src/modules/quizzes/entities/quiz-attempt.entity.ts
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Quiz } from './quiz.entity';
import { User } from '../../users/entities/user.entity';
import { QuizAttemptAnswer } from './quiz-attempt-answer.entity';

export enum QuizAttemptStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  SUBMITTED = 'SUBMITTED',
}

@Entity('quiz_attempts')
export class QuizAttempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  started_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  completed_at: Date;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  score: number;

  @Column({
    type: 'enum',
    enum: QuizAttemptStatus,
    default: QuizAttemptStatus.IN_PROGRESS,
  })
  status: QuizAttemptStatus;

  @Column({ default: 1 })
  attempt_no: number;

  // ============================================
  // RELATIONS
  // ============================================

  @ManyToOne(() => Quiz, (quiz) => quiz.attempts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quiz_id' })
  quiz: Quiz;

  @Column()
  quiz_id: string;

  @ManyToOne(() => User, (user) => user.quiz_attempts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: User;

  @Column()
  student_id: string;

  @OneToMany(() => QuizAttemptAnswer, (answer) => answer.attempt, {
    cascade: true,
  })
  answers: QuizAttemptAnswer[];
}
