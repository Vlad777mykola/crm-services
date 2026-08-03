import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
  UpdateDateColumn,
} from 'typeorm';

import { User } from '@/modules/users/user.entity.js';

export enum SessionStatus {
  ACTIVE = 'active',
  REVOKED = 'revoked',
}

/**
 * One row per refresh-token session. Only the hash of the refresh token is ever
 * stored - the raw token is returned to the client once and never persisted.
 * Rotation replaces `refreshTokenHash` on each successful /auth/refresh call.
 */
@Entity({ name: 'auth_sessions' })
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: Relation<User>;

  @Column({ type: 'varchar', length: 255, unique: true })
  refreshTokenHash!: string;

  @Column({ type: 'enum', enum: SessionStatus, default: SessionStatus.ACTIVE })
  status!: SessionStatus;

  @Column({ type: 'varchar', length: 512, nullable: true })
  userAgent!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ipAddress!: string | null;

  @Column({ type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
