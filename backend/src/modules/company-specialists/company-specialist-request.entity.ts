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

import { Company } from '@/modules/companies/company.entity.js';
import { SpecialistProfile } from '@/modules/specialists/specialist-profile.entity.js';
import { User } from '@/modules/users/user.entity.js';

export enum CompanySpecialistRequestStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

/**
 * A company's invitation for a specialist to work for them. Accepting one
 * creates (or reactivates) the corresponding `CompanySpecialist` row.
 */
@Entity({ name: 'company_specialist_requests' })
export class CompanySpecialistRequest {
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

  @Column({ type: 'uuid' })
  requestedByUserId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requestedByUserId' })
  requestedByUser!: Relation<User>;

  @Column({ type: 'enum', enum: CompanySpecialistRequestStatus, default: CompanySpecialistRequestStatus.PENDING })
  status!: CompanySpecialistRequestStatus;

  @Column({ type: 'text', nullable: true })
  message!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  respondedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
