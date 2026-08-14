import { describe, expect, it } from 'vitest';

import { studentName } from '../../src/rabbitmq/names.js';
import { tierForRetryCount, retryExchange, retryQueue } from '../../src/labs/retry/topology.js';

describe('retry topology', () => {
  it('uses student namespace for retry exchanges and queues', () => {
    expect(retryExchange('5s')).toBe('student.rabbitmq-lab.retry.5s.exchange');
    expect(retryQueue('5m')).toBe('student.rabbitmq-lab.retry.5m.q');
    expect(studentName('parking.q')).toBe('student.rabbitmq-lab.parking.q');
  });

  it('maps retry counts to tiers then parking', () => {
    expect(tierForRetryCount(0)).toBe('5s');
    expect(tierForRetryCount(1)).toBe('30s');
    expect(tierForRetryCount(2)).toBe('5m');
    expect(tierForRetryCount(3)).toBe('parking');
  });
});
