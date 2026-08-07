import { describe, expect, it } from 'vitest';

import { resolveEmailRecipient } from './recipients.js';
import type { WireEventEnvelope } from '../wire-event.js';

function envelope<Name extends string>(type: Name, data: Record<string, unknown>): WireEventEnvelope {
  return {
    id: 'event-1',
    type: type as never,
    source: 'api-service',
    time: '2026-08-04T10:00:00.000Z',
    version: '1.0',
    correlationId: 'req-1',
    data: data as never,
  };
}

describe('resolveEmailRecipient', () => {
  it('routes company-facing events to company managers', () => {
    expect(resolveEmailRecipient(envelope('appointment.requested', { companyId: 'company-1' }))).toEqual({
      kind: 'company-managers',
      companyId: 'company-1',
    });
    expect(resolveEmailRecipient(envelope('appointment.cancelled', { companyId: 'company-1' }))).toEqual({
      kind: 'company-managers',
      companyId: 'company-1',
    });
    expect(resolveEmailRecipient(envelope('review.received', { companyId: 'company-1' }))).toEqual({
      kind: 'company-managers',
      companyId: 'company-1',
    });
  });

  it('routes client-facing events to the client user', () => {
    expect(resolveEmailRecipient(envelope('appointment.approved', { clientUserId: 'user-1' }))).toEqual({
      kind: 'user',
      userId: 'user-1',
    });
    expect(resolveEmailRecipient(envelope('appointment.rejected', { clientUserId: 'user-1' }))).toEqual({
      kind: 'user',
      userId: 'user-1',
    });
    expect(resolveEmailRecipient(envelope('appointment.completed', { clientUserId: 'user-1' }))).toEqual({
      kind: 'user',
      userId: 'user-1',
    });
  });

  it('returns null for an unrecognized event type', () => {
    expect(resolveEmailRecipient(envelope('unknown.event', {}))).toBeNull();
  });
});
