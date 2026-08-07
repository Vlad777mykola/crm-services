import { describe, expect, it, vi } from 'vitest';

import { GatedEventBus, InProcessEventBus } from './event-bus.js';

const requestedPayload = {
  appointmentId: 'appointment-1',
  companyId: 'company-1',
  serviceId: 'service-1',
  serviceName: 'Consultation',
  clientName: 'Alex',
  requestedStartAt: '2026-08-04T10:00:00.000Z',
};

describe('InProcessEventBus', () => {
  it('delivers a typed event envelope to a subscriber', async () => {
    const bus = new InProcessEventBus();
    const handler = vi.fn();
    bus.subscribe('appointment.requested', handler);

    const event = await bus.publish('appointment.requested', requestedPayload);

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith(event);
    expect(event.type).toBe('appointment.requested');
    expect(event.payload).toEqual(requestedPayload);
    expect(event.id).toEqual(expect.any(String));
    expect(event.occurredAt).toEqual(expect.any(String));
  });

  it('awaits multiple handlers in registration order', async () => {
    const bus = new InProcessEventBus();
    const calls: string[] = [];
    bus.subscribe('appointment.requested', async () => {
      await Promise.resolve();
      calls.push('first');
    });
    bus.subscribe('appointment.requested', () => {
      calls.push('second');
    });

    await bus.publish('appointment.requested', requestedPayload);

    expect(calls).toEqual(['first', 'second']);
  });

  it('stops delivering events after unsubscribe', async () => {
    const bus = new InProcessEventBus();
    const handler = vi.fn();
    const unsubscribe = bus.subscribe('appointment.requested', handler);
    unsubscribe();

    await bus.publish('appointment.requested', requestedPayload);

    expect(handler).not.toHaveBeenCalled();
  });

  it('propagates subscriber failures to the publisher', async () => {
    const bus = new InProcessEventBus();
    bus.subscribe('appointment.requested', () => {
      throw new Error('notification write failed');
    });

    await expect(bus.publish('appointment.requested', requestedPayload)).rejects.toThrow('notification write failed');
  });
});

describe('GatedEventBus', () => {
  it('delegates to the inner bus when enabled', async () => {
    const inner = new InProcessEventBus();
    const handler = vi.fn();
    inner.subscribe('appointment.requested', handler);
    const bus = new GatedEventBus(inner, true);

    await bus.publish('appointment.requested', requestedPayload);

    expect(handler).toHaveBeenCalledOnce();
  });

  it('never invokes subscribers when disabled, so the caller sees no side effect', async () => {
    const inner = new InProcessEventBus();
    const handler = vi.fn();
    const bus = new GatedEventBus(inner, false);
    bus.subscribe('appointment.requested', handler);

    const event = await bus.publish('appointment.requested', requestedPayload);

    expect(handler).not.toHaveBeenCalled();
    expect(event.type).toBe('appointment.requested');
  });
});
