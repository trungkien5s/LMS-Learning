// src/modules/users/entities/user.entity.ts
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  image: string;

  @Column({ default: 'USERS' })
  role: string;

  @Column({ default: 'LOCAL' })
  accountType: string;

  @Column({ default: false })
  isActive: boolean;

  @Column({ nullable: true })
  codeId: string;

  @Column({ type: 'timestamp', nullable: true })
  codeExpired: Date;

  @Column({ nullable: true })
  resetCode: string;
    @Column({ nullable: true })
  activationToken?: string;

  @Column({ type: 'timestamp', nullable: true })
  activationTokenExpiry?: Date;


  @Column({ type: 'timestamp', nullable: true })
  resetCodeExpire: Date;

  // ✅ Thêm refresh token vào entity
  @Column({ nullable: true })
  refreshToken: string;

  @Column({ type: 'timestamp', nullable: true })
  refreshTokenExpiry: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
