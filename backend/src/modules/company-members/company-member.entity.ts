import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

import { Company } from '@/modules/companies/company.entity.js';
import { User } from '@/modules/users/user.entity.js';

export enum CompanyMemberRole {
  OWNER = 'owner',
  MANAGER = 'manager',
}

export enum CompanyMemberStatus {
  ACTIVE = 'active',
  REMOVED = 'removed',
}

/**
 * One row per (company, user) pair. The user who creates a company gets an
 * `owner` row automatically (see `companies.service.ts`). Full member
 * management (inviting managers, removing members) lands in Phase 4.
 */
@Entity({ name: 'company_members' })
@Unique('UQ_company_members_company_user', ['companyId', 'userId'])
export class CompanyMember {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  companyId!: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'companyId' })
  company!: Relation<Company>;

  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: Relation<User>;

  @Column({ type: 'enum', enum: CompanyMemberRole })
  role!: CompanyMemberRole;

  @Column({ type: 'enum', enum: CompanyMemberStatus, default: CompanyMemberStatus.ACTIVE })
  status!: CompanyMemberStatus;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
