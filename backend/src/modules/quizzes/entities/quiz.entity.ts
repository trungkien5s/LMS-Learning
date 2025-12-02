// src/modules/quizzes/entities/quiz.entity.ts
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Lesson } from '../../lessons/entities/lesson.entity';
import { Question } from '@/modules/questions/entities/question.entity';
import { QuizAttempt } from './quiz-attempt.entity';


@Entity('quizzes')
export class Quiz {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  time_limit_minutes: number;

  @Column({ nullable: true })
  total_points: number;

  @Column({ default: false })
  is_published: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // ============================================
  // RELATIONS
  // ============================================

  @ManyToOne(() => Lesson, (lesson) => lesson.quizzes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lesson_id' })
  lesson: Lesson;

  @Column()
  lesson_id: string;

  @OneToMany(() => Question, (question) => question.quiz)
  questions: Question[];

  @OneToMany(() => QuizAttempt, (attempt) => attempt.quiz)
  attempts: QuizAttempt[];
}
