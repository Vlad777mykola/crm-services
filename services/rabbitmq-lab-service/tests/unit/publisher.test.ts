import type { Channel } from 'amqplib';
import { describe, expect, it, vi } from 'vitest';

import { publishToDefaultExchange, publishToStudentExchange } from '../../src/rabbitmq/publisher.js';

function fakeChannel(): Channel {
  return { publish: vi.fn(() => true) } as unknown as Channel;
}

describe('publishToStudentExchange', () => {
  it('publishes JSON to a student exchange', () => {
    const channel = fakeChannel();
    publishToStudentExchange(channel, 'student.rabbitmq-lab.topic', 'company.created', { a: 1 });

    expect(channel.publish).toHaveBeenCalledWith(
      'student.rabbitmq-lab.topic',
      'company.created',
      expect.any(Buffer),
      expect.objectContaining({ contentType: 'application/json' }),
    );
  });

  it('refuses to publish into the real domain.events exchange', () => {
    const channel = fakeChannel();
    expect(() => publishToStudentExchange(channel, 'domain.events', 'company.created', {})).toThrow(/non-student/);
    expect(channel.publish).not.toHaveBeenCalled();
  });
});

describe('publishToDefaultExchange', () => {
  it('publishes with exchange="" and routingKey=queue name', () => {
    const channel = fakeChannel();
    publishToDefaultExchange(channel, 'student.rabbitmq-lab.hello.q', { message: 'hi' });

    expect(channel.publish).toHaveBeenCalledWith(
      '',
      'student.rabbitmq-lab.hello.q',
      expect.any(Buffer),
      expect.any(Object),
    );
  });

  it('refuses a non-student queue name', () => {
    const channel = fakeChannel();
    expect(() => publishToDefaultExchange(channel, 'companies-service.q', {})).toThrow();
    expect(channel.publish).not.toHaveBeenCalled();
  });
});
