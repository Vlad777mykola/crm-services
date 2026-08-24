import { EntitySchema } from 'typeorm';

export interface OutboxEventRow {
  id: string;
  eventType: string;
  exchange: string;
  routingKey: string;
  aggregateType: string;
  aggregateId: string;
  payload: unknown;
  status: string;
  attempts: number;
  nextRetryAt: Date;
  createdAt: Date;
  publishedAt: Date | null;
}

export const OutboxEventEntity = new EntitySchema<OutboxEventRow>({
  name: 'OutboxEvent',
  schema: 'auth_schema',
  tableName: 'outbox_events',
  columns: {
    id: { type: 'uuid', primary: true, generated: 'uuid' },
    eventType: { type: String, length: 100 },
    exchange: { type: String, length: 100 },
    routingKey: { type: String, length: 150 },
    aggregateType: { type: String, length: 100 },
    aggregateId: { type: 'uuid' },
    payload: { type: 'jsonb' },
    status: { type: String, length: 20, default: 'pending' },
    attempts: { type: Number, default: 0 },
    nextRetryAt: { type: 'timestamptz', createDate: true },
    createdAt: { type: 'timestamptz', createDate: true },
    publishedAt: { type: 'timestamptz', nullable: true },
  },
  indices: [
    { name: 'IDX_auth_outbox_events_eventType', columns: ['eventType'] },
    { name: 'IDX_auth_outbox_events_status', columns: ['status'] },
    { name: 'IDX_auth_outbox_events_nextRetryAt', columns: ['nextRetryAt'] },
  ],
});
