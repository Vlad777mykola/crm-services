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

export enum SpecialistProfileStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  SUSPENDED = 'suspended',
}

// One specialist profile per user (see the unique index on `userId`). A specialist
// profile can exist independently of any company - company relationships are added
// in Phase 6 (company-specialist request flow).
@Entity({ name: 'specialist_profiles' })
export class SpecialistProfile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: Relation<User>;

  @Column({ type: 'varchar', length: 255 })
  displayName!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  headline!: string | null;

  @Column({ type: 'text', nullable: true })
  bio!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  city!: string | null;

  @Column({ type: 'boolean', default: false })
  isRemoteSupported!: boolean;

  @Column({ type: 'enum', enum: SpecialistProfileStatus, default: SpecialistProfileStatus.DRAFT })
  status!: SpecialistProfileStatus;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
