import { EntitySchema } from 'typeorm';

export interface ProcessedEventRow {
  eventId: string;
  consumerName: string;
  processedAt: Date;
}

export const ProcessedEventEntity = new EntitySchema<ProcessedEventRow>({
  name: 'ProcessedEvent',
  schema: 'users_schema',
  tableName: 'processed_events',
  columns: {
    eventId: { name: 'event_id', type: 'uuid', primary: true },
    consumerName: { name: 'consumer_name', type: String, length: 100, primary: true },
    processedAt: { name: 'processed_at', type: 'timestamptz', createDate: true },
  },
});
