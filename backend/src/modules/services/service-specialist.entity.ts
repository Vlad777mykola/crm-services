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
} from 'typeorm';

import { Company } from '@/modules/companies/company.entity.js';
import { SpecialistProfile } from '@/modules/specialists/specialist-profile.entity.js';

import { Service } from './service.entity.js';

// Which specialists (already active at the company) are assigned to perform a
// given service. A plain M2M link - no approval workflow, since the specialist
// already accepted working for the company in Phase 6. Used by booking (later
// phases) to let a client pick a specialist for a service.
@Entity({ name: 'service_specialists' })
@Unique('UQ_service_specialists_service_specialist', ['serviceId', 'specialistProfileId'])
export class ServiceSpecialist {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  serviceId!: string;

  @ManyToOne(() => Service, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'serviceId' })
  service!: Relation<Service>;

  // Denormalized from `service.companyId` to validate the specialist's active
  // company-specialist relationship without an extra join on every check.
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

  @CreateDateColumn()
  createdAt!: Date;
}
