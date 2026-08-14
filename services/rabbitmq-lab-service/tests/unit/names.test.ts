import { describe, expect, it } from 'vitest';

import {
  assertObservableExchange,
  assertStudentName,
  isRealDomainExchange,
  isStudentName,
  studentName,
} from '../../src/rabbitmq/names.js';

describe('studentName', () => {
  it('always prefixes with student.rabbitmq-lab.', () => {
    expect(studentName('hello.q')).toBe('student.rabbitmq-lab.hello.q');
    expect(studentName('retry', '5s', 'q')).toBe('student.rabbitmq-lab.retry.5s.q');
  });
});

describe('isStudentName / isRealDomainExchange', () => {
  it('distinguishes student names from real CRM exchanges', () => {
    expect(isStudentName('student.rabbitmq-lab.topic')).toBe(true);
    expect(isStudentName('domain.events')).toBe(false);
    expect(isRealDomainExchange('domain.events')).toBe(true);
    expect(isRealDomainExchange('student.rabbitmq-lab.topic')).toBe(false);
  });
});

describe('assertStudentName', () => {
  it('accepts names inside the student namespace', () => {
    expect(() => assertStudentName('student.rabbitmq-lab.hello.q', 'queue')).not.toThrow();
  });

  it('rejects a real domain exchange', () => {
    expect(() => assertStudentName('domain.events', 'exchange')).toThrow(/non-student/);
  });

  it("rejects a real service's own queue", () => {
    expect(() => assertStudentName('companies-service.q', 'queue')).toThrow();
  });
});

describe('assertObservableExchange', () => {
  it('allows binding to the real domain.events exchange for observation', () => {
    expect(() => assertObservableExchange('domain.events')).not.toThrow();
    expect(() => assertObservableExchange('analytics.events')).not.toThrow();
  });

  it('allows binding to a student exchange', () => {
    expect(() => assertObservableExchange('student.rabbitmq-lab.topic')).not.toThrow();
  });

  it('rejects an unknown exchange name (e.g. a typo of a real one)', () => {
    expect(() => assertObservableExchange('domain.event')).toThrow();
  });
});
