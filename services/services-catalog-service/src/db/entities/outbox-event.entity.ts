import { EntitySchema } from 'typeorm';

export interface OutboxEventRow {
  id: string;
  eventType: string;
  exchange: string;
  routingKey: string;
  aggregateType: string;
  aggregateId: string;
  payload: unknown;
  correlationId: string | null;
  causationId: string | null;
  status: string;
  attempts: number;
  nextRetryAt: Date;
  createdAt: Date;
  publishedAt: Date | null;
}

export const OutboxEventEntity = new EntitySchema<OutboxEventRow>({
  name: 'OutboxEvent',
  schema: 'services_schema',
  tableName: 'outbox_events',
  columns: {
    id: { type: 'uuid', primary: true, generated: 'uuid' },
    eventType: { type: String, length: 100 },
    exchange: { type: String, length: 100 },
    routingKey: { type: String, length: 150 },
    aggregateType: { type: String, length: 100 },
    aggregateId: { type: 'uuid' },
    payload: { type: 'jsonb' },
    correlationId: { type: String, nullable: true },
    causationId: { type: String, nullable: true },
    status: { type: String, length: 20, default: 'pending' },
    attempts: { type: Number, default: 0 },
    nextRetryAt: { type: 'timestamptz', createDate: true },
    createdAt: { type: 'timestamptz', createDate: true },
    publishedAt: { type: 'timestamptz', nullable: true },
  },
  indices: [
    { name: 'IDX_services_outbox_events_status', columns: ['status'] },
    { name: 'IDX_services_outbox_events_nextRetryAt', columns: ['nextRetryAt'] },
  ],
});
