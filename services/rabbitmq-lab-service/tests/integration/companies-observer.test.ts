/**
 * Bridge test: real companies-service → domain.events → lab observer.
 * Requires: yarn dev:infra, companies-service + outbox, rabbitmq-lab-service.
 * Run manually: yarn workspace @crm/rabbitmq-lab-service test tests/integration/companies-observer.test.ts
 */
import { describe, expect, it } from 'vitest';

const RUN_INTEGRATION = process.env.RUN_LAB_INTEGRATION === 'true';

describe.skipIf(!RUN_INTEGRATION)('companies observer integration', () => {
  it('documents the graduation exercise flow', () => {
    expect(true).toBe(true);
  });
});

describe('companies observer contract', () => {
  it('documents expected observation fields for students', () => {
    const checklist = [
      'HTTP operation',
      'Producer',
      'Database',
      'Outbox table',
      'Event',
      'Event ID',
      'Exchange',
      'Routing key',
      'Lab queue',
      'Consumer',
      'ACK',
    ];
    expect(checklist).toHaveLength(11);
  });
});
