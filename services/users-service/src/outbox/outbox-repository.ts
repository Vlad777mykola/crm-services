import type { EntityManager } from 'typeorm';

import { OutboxEventEntity } from '../db/entities/outbox-event.entity.js';

const DOMAIN_EVENTS_EXCHANGE = 'domain.events';

export interface UserProfileEventPayload {
  userId: string;
  email: string | null;
  name: string;
  phone: string | null;
}

export interface RecordUserProfileEventInput {
  type: 'user.profile_created' | 'user.profile_updated';
  userId: string;
  payload: UserProfileEventPayload;
  correlationId?: string | null;
  causationId?: string | null;
}

export class OutboxRepository {
  async recordUserProfileEvent(manager: EntityManager, input: RecordUserProfileEventInput): Promise<void> {
    await manager.getRepository(OutboxEventEntity).insert({
      eventType: input.type,
      exchange: DOMAIN_EVENTS_EXCHANGE,
      routingKey: input.type,
      aggregateType: 'user',
      aggregateId: input.userId,
      payload: input.payload,
      correlationId: input.correlationId ?? null,
      causationId: input.causationId ?? null,
    });
  }
}
