import { randomUUID } from 'node:crypto';

import type { DomainEventEnvelope, DomainEventMap, DomainEventName } from './domain-events.js';

export type DomainEventHandler<Name extends DomainEventName> = (
  event: DomainEventEnvelope<Name>,
) => Promise<void> | void;

export interface EventBus {
  publish<Name extends DomainEventName>(
    type: Name,
    payload: DomainEventMap[Name],
  ): Promise<DomainEventEnvelope<Name>>;
  subscribe<Name extends DomainEventName>(type: Name, handler: DomainEventHandler<Name>): () => void;
}

type StoredHandler = (event: DomainEventEnvelope) => Promise<void> | void;

/**
 * Awaited in-process adapter. Handlers run in registration order and failures
 * propagate to the publisher, matching the notification behavior that existed
 * before the event boundary was introduced.
 */
export class InProcessEventBus implements EventBus {
  private readonly handlers = new Map<DomainEventName, Set<StoredHandler>>();

  async publish<Name extends DomainEventName>(
    type: Name,
    payload: DomainEventMap[Name],
  ): Promise<DomainEventEnvelope<Name>> {
    const event: DomainEventEnvelope<Name> = {
      id: randomUUID(),
      type,
      occurredAt: new Date().toISOString(),
      payload,
    };

    const handlers = this.handlers.get(type);
    if (handlers) {
      for (const handler of handlers) {
        await handler(event as DomainEventEnvelope);
      }
    }

    return event;
  }

  subscribe<Name extends DomainEventName>(type: Name, handler: DomainEventHandler<Name>): () => void {
    const handlers = this.handlers.get(type) ?? new Set<StoredHandler>();
    const storedHandler = handler as StoredHandler;
    handlers.add(storedHandler);
    this.handlers.set(type, handlers);

    return () => {
      handlers.delete(storedHandler);
      if (handlers.size === 0) {
        this.handlers.delete(type);
      }
    };
  }
}

export const eventBus: EventBus = new InProcessEventBus();
