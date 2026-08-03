import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum CompanyStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  SUSPENDED = 'suspended',
}

// NOTE: if relation properties are added later, use TypeORM's `Relation<T>` wrapper type
// (e.g. `members: Relation<CompanyMember[]>`) to avoid circular-import issues under ESM.
@Entity({ name: 'companies' })
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  slug!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  website!: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email!: string | null;

  @Column({ type: 'enum', enum: CompanyStatus, default: CompanyStatus.DRAFT })
  status!: CompanyStatus;

  @Column({ type: 'boolean', default: false })
  isRemoteSupported!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  city!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address!: string | null;

  @Index()
  @Column({ type: 'uuid' })
  createdByUserId!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
