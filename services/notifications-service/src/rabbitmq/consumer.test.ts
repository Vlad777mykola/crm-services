import { beforeEach, describe, expect, it, vi } from 'vitest';

const { connectMock } = vi.hoisted(() => ({ connectMock: vi.fn() }));

vi.mock('amqplib', () => ({
  default: { connect: connectMock },
}));

import { consumeFromRabbitMq } from './consumer.js';

function createFakeChannelAndConnection() {
  let storedCallback: ((msg: unknown) => void) | null = null;
  const channel = {
    assertExchange: vi.fn().mockResolvedValue(undefined),
    assertQueue: vi.fn().mockResolvedValue(undefined),
    bindQueue: vi.fn().mockResolvedValue(undefined),
    prefetch: vi.fn().mockResolvedValue(undefined),
    consume: vi.fn().mockImplementation((_queue: string, callback: (msg: unknown) => void) => {
      storedCallback = callback;
      return Promise.resolve();
    }),
    ack: vi.fn(),
    nack: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
  };
  const connection = {
    on: vi.fn(),
    createChannel: vi.fn().mockResolvedValue(channel),
    close: vi.fn().mockResolvedValue(undefined),
  };
  return { channel, connection, deliver: (msg: unknown) => storedCallback?.(msg) };
}

function fakeMessage(body: unknown, routingKey: string, exchange = 'domain.events') {
  return {
    content: Buffer.from(JSON.stringify(body)),
    fields: { routingKey, exchange },
  };
}

describe('consumeFromRabbitMq', () => {
  beforeEach(() => {
    connectMock.mockReset();
  });

  it('binds the queue with a dead-letter exchange and binds every routing key', async () => {
    const { channel, connection } = createFakeChannelAndConnection();
    connectMock.mockResolvedValue(connection);

    await consumeFromRabbitMq({
      url: 'amqp://localhost:5672',
      queue: 'notifications.q',
      deadLetterExchange: 'domain.events.dlx',
      bindings: [
        { exchange: 'domain.events', routingKey: 'appointment.*' },
        { exchange: 'domain.events', routingKey: 'review.received' },
      ],
      onMessage: vi.fn(),
    });

    expect(channel.assertQueue).toHaveBeenCalledWith('notifications.q', {
      durable: true,
      arguments: { 'x-dead-letter-exchange': 'domain.events.dlx' },
    });
    expect(channel.bindQueue).toHaveBeenCalledWith('notifications.q', 'domain.events', 'appointment.*');
    expect(channel.bindQueue).toHaveBeenCalledWith('notifications.q', 'domain.events', 'review.received');
  });

  it('parses the message body, invokes onMessage, and acks on success', async () => {
    const { channel, connection, deliver } = createFakeChannelAndConnection();
    connectMock.mockResolvedValue(connection);
    const onMessage = vi.fn().mockResolvedValue(undefined);

    await consumeFromRabbitMq({
      url: 'amqp://localhost:5672',
      queue: 'notifications.q',
      deadLetterExchange: 'domain.events.dlx',
      bindings: [{ exchange: 'domain.events', routingKey: '#' }],
      onMessage,
    });

    const msg = fakeMessage({ type: 'appointment.requested' }, 'appointment.requested');
    deliver(msg);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onMessage).toHaveBeenCalledWith({ type: 'appointment.requested' }, 'appointment.requested', 'domain.events');
    expect(channel.ack).toHaveBeenCalledWith(msg);
    expect(channel.nack).not.toHaveBeenCalled();
  });

  it('nacks without requeueing when onMessage throws, so it lands on the dead-letter queue', async () => {
    const { channel, connection, deliver } = createFakeChannelAndConnection();
    connectMock.mockResolvedValue(connection);
    const onMessage = vi.fn().mockRejectedValue(new Error('boom'));

    await consumeFromRabbitMq({
      url: 'amqp://localhost:5672',
      queue: 'notifications.q',
      deadLetterExchange: 'domain.events.dlx',
      bindings: [{ exchange: 'domain.events', routingKey: '#' }],
      onMessage,
    });

    const msg = fakeMessage({ type: 'appointment.requested' }, 'appointment.requested');
    deliver(msg);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(channel.nack).toHaveBeenCalledWith(msg, false, false);
    expect(channel.ack).not.toHaveBeenCalled();
  });

  it('closes the channel and connection on close()', async () => {
    const { channel, connection } = createFakeChannelAndConnection();
    connectMock.mockResolvedValue(connection);

    const consumer = await consumeFromRabbitMq({
      url: 'amqp://localhost:5672',
      queue: 'notifications.q',
      deadLetterExchange: 'domain.events.dlx',
      bindings: [{ exchange: 'domain.events', routingKey: '#' }],
      onMessage: vi.fn(),
    });
    await consumer.close();

    expect(channel.close).toHaveBeenCalledOnce();
    expect(connection.close).toHaveBeenCalledOnce();
  });
});
