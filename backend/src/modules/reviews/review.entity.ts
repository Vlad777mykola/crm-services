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

import { Appointment } from '@/modules/appointments/appointment.entity.js';
import { Company } from '@/modules/companies/company.entity.js';
import { Service } from '@/modules/services/service.entity.js';
import { SpecialistProfile } from '@/modules/specialists/specialist-profile.entity.js';
import { User } from '@/modules/users/user.entity.js';

// One review per completed appointment (see the unique index on `appointmentId`).
// companyId/serviceId/specialistProfileId are denormalized from the appointment at
// review time so listing a company's/service's/specialist's reviews doesn't require
// joining through appointments.
@Entity({ name: 'reviews' })
@Unique('UQ_reviews_appointment', ['appointmentId'])
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'uuid' })
  appointmentId!: string;

  @ManyToOne(() => Appointment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'appointmentId' })
  appointment!: Relation<Appointment>;

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

  @Column({ type: 'uuid' })
  clientUserId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clientUserId' })
  client!: Relation<User>;

  @Column({ type: 'smallint' })
  rating!: number;

  @Column({ type: 'text', nullable: true })
  comment!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
