import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum OutboxEventStatus {
  PENDING = 'pending',
  PUBLISHED = 'published',
  FAILED = 'failed',
}

// Written exclusively by backend business transactions (same DB transaction as
// the business write it accompanies - see outbox.service.ts). Read/updated
// exclusively by services/outbox-publisher, which has no access to any other
// table in this database - see docs/architecture/service-ownership.md.
@Entity({ name: 'outbox_events' })
export class OutboxEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'varchar', length: 100 })
  eventType!: string;

  // e.g. 'domain.events', 'analytics.events', 'commands' - not every event
  // goes to the same exchange, so the publisher must not hardcode one.
  @Column({ type: 'varchar', length: 100 })
  exchange!: string;

  @Column({ type: 'varchar', length: 150 })
  routingKey!: string;

  @Column({ type: 'varchar', length: 100 })
  aggregateType!: string;

  @Column({ type: 'uuid' })
  aggregateId!: string;

  @Column({ type: 'jsonb' })
  payload!: Record<string, unknown>;

  @Index()
  @Column({ type: 'varchar', length: 20, default: OutboxEventStatus.PENDING })
  status!: OutboxEventStatus;

  @Column({ type: 'int', default: 0 })
  attempts!: number;

  @Index()
  @Column({ type: 'timestamptz', default: () => 'now()' })
  nextRetryAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  publishedAt!: Date | null;
}
