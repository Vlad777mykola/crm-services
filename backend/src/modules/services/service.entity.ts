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

export enum ServiceStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  SUSPENDED = 'suspended',
}

// A service a company offers in its catalog. Assigning specific specialists to
// perform a service, and booking/availability, are added in later phases.
@Entity({ name: 'services' })
export class Service {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  companyId!: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'companyId' })
  company!: Relation<Company>;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category!: string | null;

  @Column({ type: 'int' })
  durationMinutes!: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  price!: string | null;

  @Column({ type: 'enum', enum: ServiceStatus, default: ServiceStatus.DRAFT })
  status!: ServiceStatus;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
