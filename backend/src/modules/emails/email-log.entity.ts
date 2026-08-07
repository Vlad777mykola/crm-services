import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

// Written exclusively by services/notifications-service, never by the API
// process directly - see docs/architecture/service-ownership.md. No real
// email provider is wired up yet - this table is the "did we send it, and
// what did it say" record for the simulated send, so that service's behavior
// is inspectable/testable without an SMTP dependency.
@Entity({ name: 'email_logs' })
export class EmailLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  toEmail!: string;

  @Column({ type: 'varchar', length: 255 })
  subject!: string;

  @Column({ type: 'text' })
  body!: string;

  @Index()
  @Column({ type: 'varchar', length: 100 })
  eventType!: string;

  @Column({ type: 'uuid' })
  eventId!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
