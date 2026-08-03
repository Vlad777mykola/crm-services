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

import { User } from '@/modules/users/user.entity.js';

/**
 * One row per (user, auth provider) pair. `provider` is e.g. "password", "google",
 * "github". For password auth, `providerUserId` is the user's email and
 * `passwordHash` is set; for OAuth2 providers (future), `providerUserId` is the
 * provider's user id and `passwordHash` stays null.
 */
@Entity({ name: 'auth_identities' })
@Unique('UQ_auth_identities_provider_provider_user_id', ['provider', 'providerUserId'])
export class AuthIdentity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: Relation<User>;

  @Column({ type: 'varchar', length: 50 })
  provider!: string;

  @Column({ type: 'varchar', length: 255 })
  providerUserId!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  passwordHash!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
