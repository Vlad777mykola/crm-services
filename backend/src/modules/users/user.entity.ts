import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum UserStatus {
  ACTIVE = 'active',
  DISABLED = 'disabled',
}

// NOTE: if relation properties are added later, use TypeORM's `Relation<T>` wrapper type
// (e.g. `orders: Relation<Order[]>`) to avoid circular-import issues under ESM.
@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  city!: string | null;

  @Column({ type: 'text', nullable: true })
  bio!: string | null;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status!: UserStatus;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
