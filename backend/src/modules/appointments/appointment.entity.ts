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
import { Service } from '@/modules/services/service.entity.js';
import { SpecialistProfile } from '@/modules/specialists/specialist-profile.entity.js';
import { User } from '@/modules/users/user.entity.js';

export enum AppointmentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

// A client's request for a company's service, optionally with a preferred
// specialist. Approval/rejection is done by the company owner/manager; the
// client may cancel their own pending/approved request.
@Entity({ name: 'appointments' })
export class Appointment {
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
  serviceId!: string;

  @ManyToOne(() => Service, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'serviceId' })
  service!: Relation<Service>;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  specialistProfileId!: string | null;

  @ManyToOne(() => SpecialistProfile, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'specialistProfileId' })
  specialist!: Relation<SpecialistProfile> | null;

  @Index()
  @Column({ type: 'uuid' })
  clientUserId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clientUserId' })
  client!: Relation<User>;

  @Column({ type: 'timestamptz' })
  requestedStartAt!: Date;

  @Column({ type: 'enum', enum: AppointmentStatus, default: AppointmentStatus.PENDING })
  status!: AppointmentStatus;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  respondedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
