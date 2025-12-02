// src/modules/lessons/entities/lesson.entity.ts
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
import { Course } from '../../courses/entities/course.entity';

import { DiscussionThread } from '@/modules/discussions/entites/discussion-thread.entity';
import { Quiz } from '@/modules/quizzes/entities/quiz.entity';

export enum LessonType {
  VIDEO = 'VIDEO',
  ARTICLE = 'ARTICLE',
  QUIZ = 'QUIZ',
  FILE = 'FILE',
}

@Entity('lessons')
export class Lesson {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column()
  slug: string;

  @Column()
  order_index: number;

  @Column({
    type: 'enum',
    enum: LessonType,
  })
  type: LessonType;

  @Column({ nullable: true })
  video_url: string;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ nullable: true })
  duration_seconds: number;

  @Column({ default: false })
  is_preview: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // ============================================
  // RELATIONS
  // ============================================

  // N Lessons -> 1 Course
  @ManyToOne(() => Course, (course) => course.lessons, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @Column()
  course_id: string;

  // 1 Lesson -> N Quizzes
  @OneToMany(() => Quiz, (quiz) => quiz.lesson)
  quizzes: Quiz[];

  // 1 Lesson -> N Discussion Threads
  @OneToMany(() => DiscussionThread, (thread) => thread.lesson)
  discussion_threads: DiscussionThread[];
}
