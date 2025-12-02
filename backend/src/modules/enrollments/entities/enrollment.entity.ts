import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, Unique } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Course } from '../../courses/entities/course.entity';

@Entity('enrollments')
@Unique(['student_id', 'course_id'])  // ← UNIQUE constraint quan trọng!
export class Enrollment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ 
    type: 'enum', 
    enum: ['ACTIVE', 'COMPLETED', 'CANCELLED'],
    default: 'ACTIVE'
  })
  status: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  progress_percent: number;

  @Column({ nullable: true })
  last_accessed_at: Date;

  @CreateDateColumn()
  enrolled_at: Date;

  // Quan hệ: N Enrollments - 1 Student
  @ManyToOne(() => User, user => user.enrollments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: User;

  @Column()
  student_id: string;

  // Quan hệ: N Enrollments - 1 Course
  @ManyToOne(() => Course, course => course.enrollments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @Column()
  course_id: string;
}
