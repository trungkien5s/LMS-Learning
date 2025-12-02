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
import { User } from '../../users/entities/user.entity';
import { Lesson } from '@/modules/lessons/entities/lesson.entity';
import { Enrollment } from '@/modules/enrollments/entities/enrollment.entity';
import { DiscussionThread } from '@/modules/discussions/entites/discussion-thread.entity';


export enum CourseLevel {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
}

export enum CourseStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  thumbnail_url: string;

  @Column({
    type: 'enum',
    enum: CourseLevel,
    default: CourseLevel.BEGINNER,
  })
  level: CourseLevel;

  @Column({
    type: 'enum',
    enum: CourseStatus,
    default: CourseStatus.DRAFT,
  })
  status: CourseStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price: number;

  @Column({ nullable: true })
  published_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // ============================================
  // RELATIONS
  // ============================================

  // N Courses -> 1 Teacher
  @ManyToOne(() => User, (user) => user.courses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacher_id' })
  teacher: User;

  @Column()
  teacher_id: string;

  // 1 Course -> N Lessons
  @OneToMany(() => Lesson, (lesson) => lesson.course)
  lessons: Lesson[];

  // 1 Course -> N Enrollments
  @OneToMany(() => Enrollment, (enrollment) => enrollment.course)
  enrollments: Enrollment[];

  // 1 Course -> N Discussion Threads
  @OneToMany(() => DiscussionThread, (thread) => thread.course)
  discussion_threads: DiscussionThread[];
}