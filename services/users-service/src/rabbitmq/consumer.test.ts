import { EventEmitter } from 'node:events';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { connectMock } = vi.hoisted(() => ({ connectMock: vi.fn() }));

vi.mock('amqplib', () => ({
  default: { connect: connectMock },
}));

import { consumeFromRabbitMq } from './consumer.js';

class FakeChannel extends EventEmitter {
  assertExchange = vi.fn().mockResolvedValue(undefined);
  assertQueue = vi.fn().mockResolvedValue(undefined);
  bindQueue = vi.fn().mockResolvedValue(undefined);
  prefetch = vi.fn().mockResolvedValue(undefined);
  ack = vi.fn();
  nack = vi.fn();
  publish = vi.fn().mockReturnValue(true);
  close = vi.fn().mockImplementation(async () => {
    queueMicrotask(() => this.emit('close'));
  });
  consume: ReturnType<typeof vi.fn>;
  private storedCallback: ((msg: unknown) => void) | null = null;

  constructor() {
    super();
    this.consume = vi.fn().mockImplementation((_queue: string, callback: (msg: unknown) => void) => {
      this.storedCallback = callback;
      return Promise.resolve();
    });
  }

  deliver(msg: unknown): void {
    this.storedCallback?.(msg);
  }
}

class FakeConnection extends EventEmitter {
  createChannel: ReturnType<typeof vi.fn>;
  close = vi.fn().mockImplementation(async () => {
    queueMicrotask(() => this.emit('close'));
  });

  constructor(channel: FakeChannel) {
    super();
    this.createChannel = vi.fn().mockResolvedValue(channel);
  }
}

function fakeMessage(body: unknown, routingKey: string, exchange = 'domain.events') {
  return {
    content: Buffer.from(JSON.stringify(body)),
    fields: { routingKey, exchange },
    properties: { headers: {} as Record<string, unknown> },
  };
}

function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('consumeFromRabbitMq (users-service)', () => {
  beforeEach(() => {
    connectMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('binds the queue with a dead-letter exchange, acks on success', async () => {
    const channel = new FakeChannel();
    const connection = new FakeConnection(channel);
    connectMock.mockResolvedValue(connection);
    const onMessage = vi.fn().mockResolvedValue(undefined);

    const consumer = await consumeFromRabbitMq({
      url: 'amqp://localhost:5672',
      queue: 'users-service.q',
      deadLetterExchange: 'domain.events.dlx',
      bindings: [{ exchange: 'domain.events', routingKey: 'auth.user_registered' }],
      onMessage,
    });

    expect(channel.assertQueue).toHaveBeenCalledWith('users-service.q', {
      durable: true,
      arguments: { 'x-dead-letter-exchange': 'domain.events.dlx' },
    });
    expect(consumer.isConnected()).toBe(true);

    const msg = fakeMessage({ type: 'auth.user_registered' }, 'auth.user_registered');
    channel.deliver(msg);
    await flush();

    expect(onMessage).toHaveBeenCalledWith({ type: 'auth.user_registered' }, 'auth.user_registered', 'domain.events');
    expect(channel.ack).toHaveBeenCalledWith(msg);
  });

  it('is not ready until the channel/topology/consume setup fully completes', async () => {
    const channel = new FakeChannel();
    let resolveBind: (() => void) | null = null;
    channel.consume.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveBind = () => resolve();
        }),
    );
    const connection = new FakeConnection(channel);
    connectMock.mockResolvedValue(connection);

    const pending = consumeFromRabbitMq({
      url: 'amqp://localhost:5672',
      queue: 'users-service.q',
      deadLetterExchange: 'domain.events.dlx',
      bindings: [{ exchange: 'domain.events', routingKey: '#' }],
      onMessage: vi.fn(),
    });

    await flush();
    resolveBind?.();
    const consumer = await pending;

    expect(consumer.isConnected()).toBe(true);
  });

  it('recovers when the consumer channel closes unexpectedly, without a second connect() call being required manually', async () => {
    vi.useFakeTimers();
    const channel1 = new FakeChannel();
    const connection1 = new FakeConnection(channel1);
    const channel2 = new FakeChannel();
    const connection2 = new FakeConnection(channel2);
    connectMock.mockResolvedValueOnce(connection1).mockResolvedValueOnce(connection2);

    const consumer = await consumeFromRabbitMq({
      url: 'amqp://localhost:5672',
      queue: 'users-service.q',
      deadLetterExchange: 'domain.events.dlx',
      bindings: [{ exchange: 'domain.events', routingKey: '#' }],
      onMessage: vi.fn(),
    });

    expect(consumer.isConnected()).toBe(true);

    // The TCP connection stays open - only the channel dies.
    channel1.emit('close');
    await vi.advanceTimersByTimeAsync(0);
    expect(consumer.isConnected()).toBe(false);

    await vi.advanceTimersByTimeAsync(2_000);

    expect(connectMock).toHaveBeenCalledTimes(2);
    expect(connection2.createChannel).toHaveBeenCalledOnce();
    expect(consumer.isConnected()).toBe(true);
  });

  it('closes the connection on close() and is safe to call twice', async () => {
    const channel = new FakeChannel();
    const connection = new FakeConnection(channel);
    connectMock.mockResolvedValue(connection);

    const consumer = await consumeFromRabbitMq({
      url: 'amqp://localhost:5672',
      queue: 'users-service.q',
      deadLetterExchange: 'domain.events.dlx',
      bindings: [{ exchange: 'domain.events', routingKey: '#' }],
      onMessage: vi.fn(),
    });

    await consumer.close();
    await consumer.close();

    expect(connection.close).toHaveBeenCalledOnce();
    expect(consumer.isConnected()).toBe(false);
  });
});
