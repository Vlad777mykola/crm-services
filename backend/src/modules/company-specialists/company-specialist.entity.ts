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
import { SpecialistProfile } from '@/modules/specialists/specialist-profile.entity.js';

export enum CompanySpecialistStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  REMOVED = 'removed',
}

/**
 * The active working relationship created once a specialist accepts a
 * company's request. Services/availability (Phases 7-8) attach to this pair.
 */
@Entity({ name: 'company_specialists' })
@Unique('UQ_company_specialists_company_specialist', ['companyId', 'specialistProfileId'])
export class CompanySpecialist {
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
  specialistProfileId!: string;

  @ManyToOne(() => SpecialistProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'specialistProfileId' })
  specialist!: Relation<SpecialistProfile>;

  @Column({ type: 'enum', enum: CompanySpecialistStatus, default: CompanySpecialistStatus.ACTIVE })
  status!: CompanySpecialistStatus;

  @Column({ type: 'timestamptz' })
  startedAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  endedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
