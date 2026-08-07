import { randomUUID } from 'node:crypto';

import { env } from '@/env/env.js';

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
 * before the event boundary was introduced. This is no longer the path that
 * reaches other services - see infrastructure/outbox for that - it only
 * drives the MVP in-process notification subscriber (see GatedEventBus below).
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

/**
 * Wraps an EventBus so subscribe()/publish() become no-ops once
 * `IN_PROCESS_NOTIFICATIONS_ENABLED=false`. That flag is flipped once
 * services/notifications-service is deployed, so exactly one thing ever
 * creates a notification for a given domain event - see "side-effect
 * ownership" in docs/architecture/service-ownership.md. Business services
 * always call `eventBus.publish(...)`; this gate is the single place that
 * decides whether anyone is actually listening in-process.
 */
export class GatedEventBus implements EventBus {
  constructor(
    private readonly inner: EventBus,
    private readonly enabled: boolean,
  ) {}

  async publish<Name extends DomainEventName>(
    type: Name,
    payload: DomainEventMap[Name],
  ): Promise<DomainEventEnvelope<Name>> {
    if (!this.enabled) {
      return { id: randomUUID(), type, occurredAt: new Date().toISOString(), payload };
    }
    return this.inner.publish(type, payload);
  }

  subscribe<Name extends DomainEventName>(type: Name, handler: DomainEventHandler<Name>): () => void {
    if (!this.enabled) {
      return () => {};
    }
    return this.inner.subscribe(type, handler);
  }
}

export const eventBus: EventBus = new GatedEventBus(new InProcessEventBus(), env.IN_PROCESS_NOTIFICATIONS_ENABLED);
