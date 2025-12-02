import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { DiscussionThread } from "./discussion-thread.entity";
import { User } from "@/modules/users/entities/user.entity";

// src/modules/discussions/entities/discussion-post.entity.ts
@Entity('discussion_posts')
export class DiscussionPost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ default: false })
  is_deleted: boolean;

  @CreateDateColumn()
  created_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  updated_at: Date;

  // ============================================
  // RELATIONS
  // ============================================

  @ManyToOne(() => DiscussionThread, (thread) => thread.posts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'thread_id' })
  thread: DiscussionThread;

  @Column()
  thread_id: string;

  // Self-referencing for replies (parent-child structure)
  @ManyToOne(() => DiscussionPost, (post) => post.replies, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: DiscussionPost;

  @Column({ nullable: true })
  parent_id: string;

  @OneToMany(() => DiscussionPost, (post) => post.parent)
  replies: DiscussionPost[];

  @ManyToOne(() => User, (user) => user.discussion_posts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'created_by' })
  created_by_user: User;

  @Column()
  created_by: string;
}
