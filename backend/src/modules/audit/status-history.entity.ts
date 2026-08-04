import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum AuditEntityType {
  APPOINTMENT = 'appointment',
  COMPANY = 'company',
  SERVICE = 'service',
  SPECIALIST_PROFILE = 'specialist_profile',
}

/**
 * Append-only ledger of status transitions across modules. Deliberately kept
 * generic (entityType + entityId) instead of a FK-per-module table, so it can
 * audit appointments, companies, services, and specialist profiles alike
 * without those modules needing to know about each other.
 */
@Entity({ name: 'status_history_entries' })
export class StatusHistoryEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'varchar', length: 50 })
  entityType!: AuditEntityType;

  @Index()
  @Column({ type: 'uuid' })
  entityId!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  fromStatus!: string | null;

  @Column({ type: 'varchar', length: 50 })
  toStatus!: string;

  // Null means the system made the change rather than a specific user.
  @Column({ type: 'uuid', nullable: true })
  changedByUserId!: string | null;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
