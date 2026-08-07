import { describe, expect, it } from 'vitest';

import { buildEmailContent } from './content.js';
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

describe('buildEmailContent', () => {
  it('builds content for appointment.requested', () => {
    const content = buildEmailContent(
      envelope('appointment.requested', {
        serviceName: 'Consultation',
        clientName: 'Alex',
        requestedStartAt: '2026-08-05T10:00:00.000Z',
      }),
    );

    expect(content?.subject).toContain('Consultation');
    expect(content?.body).toContain('Alex');
  });

  it('builds content for appointment.approved', () => {
    const content = buildEmailContent(
      envelope('appointment.approved', {
        serviceName: 'Consultation',
        companyName: 'Acme Co',
        requestedStartAt: '2026-08-05T10:00:00.000Z',
      }),
    );

    expect(content?.subject).toContain('approved');
    expect(content?.body).toContain('Acme Co');
  });

  it('builds content for review.received, falling back when there is no comment', () => {
    const withComment = buildEmailContent(
      envelope('review.received', { serviceName: 'Consultation', rating: 5, comment: 'Great!' }),
    );
    expect(withComment?.body).toBe('Great!');

    const withoutComment = buildEmailContent(
      envelope('review.received', { serviceName: 'Consultation', rating: 5, comment: null }),
    );
    expect(withoutComment?.body).toBe('No comment was left.');
  });

  it('returns null for an unrecognized event type', () => {
    expect(buildEmailContent(envelope('unknown.event', {}))).toBeNull();
  });
});
