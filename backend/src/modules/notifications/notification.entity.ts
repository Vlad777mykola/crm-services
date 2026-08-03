import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, type Relation } from 'typeorm';

import { User } from '@/modules/users/user.entity.js';

// Kept as a free-form string (not a DB enum) so new event producers - appointments
// today, comments/reviews/OAuth2 invites later - can introduce new types without a
// migration. Frontend just needs a human-readable title/body, so the type is mostly
// useful for icon/routing decisions and future filtering.
export enum NotificationType {
  APPOINTMENT_REQUESTED = 'appointment.requested',
  APPOINTMENT_APPROVED = 'appointment.approved',
  APPOINTMENT_REJECTED = 'appointment.rejected',
  APPOINTMENT_CANCELLED = 'appointment.cancelled',
}

@Entity({ name: 'notifications' })
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: Relation<User>;

  @Column({ type: 'varchar', length: 100 })
  type!: NotificationType;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  body!: string | null;

  // Arbitrary event payload (e.g. { appointmentId, companyId, serviceId }) so the
  // frontend can deep-link without the backend needing a bespoke DTO per event type.
  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @Index()
  @Column({ type: 'boolean', default: false })
  isRead!: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  readAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}
