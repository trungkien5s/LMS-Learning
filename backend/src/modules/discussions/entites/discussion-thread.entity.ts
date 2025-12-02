// src/modules/discussions/entities/discussion-thread.entity.ts
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Course } from '../../courses/entities/course.entity';
import { Lesson } from '../../lessons/entities/lesson.entity';
import { User } from '../../users/entities/user.entity';
import { DiscussionPost } from './discussion-post.entity';


@Entity('discussion_threads')
export class DiscussionThread {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ default: false })
  pinned: boolean;

  @CreateDateColumn()
  created_at: Date;

  // ============================================
  // RELATIONS
  // ============================================

  @ManyToOne(() => Course, (course) => course.discussion_threads, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @Column()
  course_id: string;

  @ManyToOne(() => Lesson, (lesson) => lesson.discussion_threads, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'lesson_id' })
  lesson: Lesson;

  @Column({ nullable: true })
  lesson_id: string;

  @ManyToOne(() => User, (user) => user.discussion_threads, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'created_by' })
  created_by_user: User;

  @Column()
  created_by: string;

  @OneToMany(() => DiscussionPost, (post) => post.thread)
  posts: DiscussionPost[];
}