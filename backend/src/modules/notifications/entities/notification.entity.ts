import { User } from "@/modules/users/entities/user.entity";
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

// src/modules/notifications/entities/notification.entity.ts
export enum NotificationType {
  NEW_LESSON = 'NEW_LESSON',
  QUIZ_RESULT = 'QUIZ_RESULT',
  DISCUSSION_REPLY = 'DISCUSSION_REPLY',
  COURSE_UPDATE = 'COURSE_UPDATE',
  ENROLLMENT_CONFIRMATION = 'ENROLLMENT_CONFIRMATION',
  GENERAL = 'GENERAL',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'timestamp', nullable: true })
  read_at: Date;

  @CreateDateColumn()
  created_at: Date;

  // Optional: Link to related entity
  @Column({ nullable: true })
  related_id: string; // ID của course/quiz/thread/...

  @Column({ nullable: true })
  related_type: string; // 'course', 'quiz', 'thread'...

  // ============================================
  // RELATIONS
  // ============================================

  @ManyToOne(() => User, (user) => user.notifications, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  user_id: string;
}