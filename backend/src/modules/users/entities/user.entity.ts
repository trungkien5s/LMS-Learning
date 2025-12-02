import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Course } from '../../courses/entities/course.entity';
import { Enrollment } from '@/modules/enrollments/entities/enrollment.entity';
import { DiscussionThread } from '@/modules/discussions/entites/discussion-thread.entity';
import { DiscussionPost } from '@/modules/discussions/entites/discussion-post.entity';
import { QuizAttempt } from '@/modules/quizzes/entities/quiz-attempt.entity';
import { Notification } from '@/modules/notifications/entities/notification.entity';


export enum UserRole {
  ADMIN = 'ADMIN',
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT',
}

export enum AccountType {
  LOCAL = 'LOCAL',
  GOOGLE = 'GOOGLE',
  FACEBOOK = 'FACEBOOK',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  full_name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password_hash: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  avatar_url: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.STUDENT,
  })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: AccountType,
    default: AccountType.LOCAL,
  })
  account_type: AccountType;

  @Column({ default: false })
  is_active: boolean;

  // ✅ Activation Code (để kích hoạt tài khoản qua email)
  @Column({ nullable: true })
  activation_token: string;

  @Column({ type: 'timestamp', nullable: true })
  activation_token_expiry: Date;

  // ✅ Reset Password Code
  @Column({ nullable: true })
  reset_password_token: string;

  @Column({ type: 'timestamp', nullable: true })
  reset_password_token_expiry: Date;

  // ✅ Refresh Token (JWT)
  @Column({ nullable: true })
  refresh_token: string;

  @Column({ type: 'timestamp', nullable: true })
  refresh_token_expiry: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // ============================================
  // RELATIONS
  // ============================================

  // 1 Teacher -> N Courses
  @OneToMany(() => Course, (course) => course.teacher)
  courses: Course[];

  // 1 Student -> N Enrollments
  @OneToMany(() => Enrollment, (enrollment) => enrollment.student)
  enrollments: Enrollment[];

  // 1 User -> N Discussion Threads
  @OneToMany(() => DiscussionThread, (thread) => thread.created_by_user)
  discussion_threads: DiscussionThread[];

  // 1 User -> N Discussion Posts
  @OneToMany(() => DiscussionPost, (post) => post.created_by_user)
  discussion_posts: DiscussionPost[];

  // 1 Student -> N Quiz Attempts
  @OneToMany(() => QuizAttempt, (attempt) => attempt.student)
  quiz_attempts: QuizAttempt[];

  // 1 User -> N Notifications
  @OneToMany(() => Notification
  , (notification) => notification.user)
  notifications: Notification[];
}