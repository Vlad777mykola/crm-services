import { EventEmitter } from 'node:events';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { connectMock } = vi.hoisted(() => ({ connectMock: vi.fn() }));

vi.mock('amqplib', () => ({
  default: { connect: connectMock },
}));

import { connectManaged, type ManagedConnectionContext } from './connect-managed.js';

function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

class FakeConnection extends EventEmitter {
  close = vi.fn().mockImplementation(async () => {
    queueMicrotask(() => this.emit('close'));
  });
  createChannel = vi.fn();
}

function silentLogger() {
  return { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

describe('connectManaged', () => {
  beforeEach(() => {
    connectMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('is connected (TCP) as soon as amqp.connect resolves, but not ready until setup() finishes', async () => {
    const conn = new FakeConnection();
    let resolveSetup: (() => void) | null = null;
    connectMock.mockResolvedValue(conn);

    const managed = connectManaged({
      url: 'amqp://localhost',
      serviceName: 'test-service',
      logger: silentLogger(),
      setup: () =>
        new Promise<void>((resolve) => {
          resolveSetup = resolve;
        }),
    });

    await flush();
    expect(managed.isConnected()).toBe(true);
    expect(managed.isReady()).toBe(false);

    resolveSetup?.();
    await flush();
    expect(managed.isConnected()).toBe(true);
    expect(managed.isReady()).toBe(true);
  });

  it('is not ready while only the TCP connection exists', async () => {
    const conn = new FakeConnection();
    connectMock.mockResolvedValue(conn);

    const managed = connectManaged({
      url: 'amqp://localhost',
      serviceName: 'test-service',
      logger: silentLogger(),
      setup: () => new Promise<void>(() => {}),
    });

    await flush();
    expect(managed.isReady()).toBe(false);
  });

  it('becomes not-ready and reconnects when setup() throws, without leaving the TCP connection alive', async () => {
    vi.useFakeTimers();
    const conn1 = new FakeConnection();
    const conn2 = new FakeConnection();
    connectMock.mockResolvedValueOnce(conn1).mockResolvedValueOnce(conn2);

    const setup = vi
      .fn()
      .mockRejectedValueOnce(new Error('setup failed'))
      .mockResolvedValueOnce(undefined);

    const managed = connectManaged({
      url: 'amqp://localhost',
      serviceName: 'test-service',
      logger: silentLogger(),
      setup,
    });

    await vi.advanceTimersByTimeAsync(0);
    expect(managed.isReady()).toBe(false);
    expect(managed.isConnected()).toBe(false);
    expect(conn1.close).toHaveBeenCalledOnce();

    await vi.advanceTimersByTimeAsync(2_000);
    expect(connectMock).toHaveBeenCalledTimes(2);
    expect(managed.isReady()).toBe(true);
    expect(managed.isConnected()).toBe(true);
  });

  it('recovers when the underlying connection closes unexpectedly', async () => {
    vi.useFakeTimers();
    const conn1 = new FakeConnection();
    const conn2 = new FakeConnection();
    connectMock.mockResolvedValueOnce(conn1).mockResolvedValueOnce(conn2);

    const setup = vi.fn().mockResolvedValue(undefined);

    const managed = connectManaged({
      url: 'amqp://localhost',
      serviceName: 'test-service',
      logger: silentLogger(),
      setup,
    });

    await vi.advanceTimersByTimeAsync(0);
    expect(managed.isReady()).toBe(true);
    expect(setup).toHaveBeenCalledTimes(1);

    conn1.emit('close');
    await vi.advanceTimersByTimeAsync(0);
    expect(managed.isReady()).toBe(false);
    expect(managed.isConnected()).toBe(false);

    await vi.advanceTimersByTimeAsync(2_000);
    expect(setup).toHaveBeenCalledTimes(2);
    expect(managed.isReady()).toBe(true);
    expect(managed.getConnection()).toBe(conn2);
  });

  it('recovers when the service invalidates the setup via context.invalidate() (e.g. channel close)', async () => {
    vi.useFakeTimers();
    const conn1 = new FakeConnection();
    const conn2 = new FakeConnection();
    connectMock.mockResolvedValueOnce(conn1).mockResolvedValueOnce(conn2);

    let context1: ManagedConnectionContext | null = null;
    const setup = vi.fn().mockImplementation(async (_conn, ctx: ManagedConnectionContext) => {
      context1 ??= ctx;
    });

    const managed = connectManaged({
      url: 'amqp://localhost',
      serviceName: 'test-service',
      logger: silentLogger(),
      setup,
    });

    await vi.advanceTimersByTimeAsync(0);
    expect(managed.isReady()).toBe(true);

    context1?.invalidate(new Error('channel closed'));
    await vi.advanceTimersByTimeAsync(0);
    expect(managed.isReady()).toBe(false);
    expect(managed.isConnected()).toBe(false);
    expect(conn1.close).toHaveBeenCalledOnce();

    await vi.advanceTimersByTimeAsync(2_000);
    expect(setup).toHaveBeenCalledTimes(2);
    expect(managed.isReady()).toBe(true);
    expect(managed.getConnection()).toBe(conn2);
  });

  it('collapses simultaneous failure signals (channel close + connection error + connection close) into one reconnect', async () => {
    vi.useFakeTimers();
    const conn1 = new FakeConnection();
    const conn2 = new FakeConnection();
    connectMock.mockResolvedValueOnce(conn1).mockResolvedValueOnce(conn2);

    let context1: ManagedConnectionContext | null = null;
    const setup = vi.fn().mockImplementation(async (_conn, ctx: ManagedConnectionContext) => {
      context1 ??= ctx;
    });

    const managed = connectManaged({
      url: 'amqp://localhost',
      serviceName: 'test-service',
      logger: silentLogger(),
      setup,
    });

    await vi.advanceTimersByTimeAsync(0);
    expect(managed.isReady()).toBe(true);

    // Simulate: republish failure closes the channel, which the service
    // reports via invalidate(); the connection then also emits error+close.
    context1?.invalidate(new Error('channel closed'));
    conn1.emit('error', new Error('boom'));
    conn1.emit('close');

    await vi.advanceTimersByTimeAsync(30_000);

    // Exactly one reconnect cycle -> exactly one extra connect() call.
    expect(connectMock).toHaveBeenCalledTimes(2);
    expect(setup).toHaveBeenCalledTimes(2);
    expect(managed.isReady()).toBe(true);
  });

  it('ignores stale context.invalidate() from a prior connection after reconnect', async () => {
    vi.useFakeTimers();
    const conn1 = new FakeConnection();
    const conn2 = new FakeConnection();
    connectMock.mockResolvedValueOnce(conn1).mockResolvedValueOnce(conn2);

    let context1: ManagedConnectionContext | null = null;
    let context2: ManagedConnectionContext | null = null;
    const setup = vi.fn().mockImplementation(async (_conn, ctx: ManagedConnectionContext) => {
      if (!context1) {
        context1 = ctx;
        return;
      }
      context2 = ctx;
    });

    const managed = connectManaged({
      url: 'amqp://localhost',
      serviceName: 'test-service',
      logger: silentLogger(),
      setup,
    });

    await vi.advanceTimersByTimeAsync(0);
    expect(managed.isReady()).toBe(true);
    expect(managed.getConnection()).toBe(conn1);

    conn1.emit('close');
    await vi.advanceTimersByTimeAsync(2_000);
    expect(managed.isReady()).toBe(true);
    expect(managed.getConnection()).toBe(conn2);

    context1?.invalidate(new Error('delayed channel close from conn1'));
    await vi.advanceTimersByTimeAsync(30_000);

    expect(connectMock).toHaveBeenCalledTimes(2);
    expect(managed.isReady()).toBe(true);
    expect(managed.getConnection()).toBe(conn2);
    expect(context2).not.toBeNull();
  });

  it('shutdown cancels pending reconnect timers and prevents new connect attempts', async () => {
    vi.useFakeTimers();
    connectMock.mockRejectedValueOnce(new Error('unreachable'));

    const managed = connectManaged({
      url: 'amqp://localhost',
      serviceName: 'test-service',
      logger: silentLogger(),
      setup: vi.fn().mockResolvedValue(undefined),
    });

    await vi.advanceTimersByTimeAsync(0);
    expect(connectMock).toHaveBeenCalledTimes(1);

    await managed.close();
    await vi.advanceTimersByTimeAsync(60_000);

    expect(connectMock).toHaveBeenCalledTimes(1);
    expect(managed.isReady()).toBe(false);

    await expect(managed.close()).resolves.toBeUndefined();
  });

  it('shutdown closes the active connection and is idempotent', async () => {
    const conn = new FakeConnection();
    connectMock.mockResolvedValue(conn);

    const managed = connectManaged({
      url: 'amqp://localhost',
      serviceName: 'test-service',
      logger: silentLogger(),
      setup: vi.fn().mockResolvedValue(undefined),
    });

    await flush();
    expect(managed.isReady()).toBe(true);

    await managed.close();
    expect(conn.close).toHaveBeenCalledOnce();
    expect(managed.isReady()).toBe(false);
    expect(managed.isConnected()).toBe(false);

    await managed.close();
    expect(conn.close).toHaveBeenCalledOnce();
  });

  it('passes connectionOptions through to amqp.connect', async () => {
    const conn = new FakeConnection();
    connectMock.mockResolvedValue(conn);

    connectManaged({
      url: 'amqp://localhost',
      serviceName: 'test-service',
      logger: silentLogger(),
      connectionOptions: { heartbeat: 15 },
      setup: vi.fn().mockResolvedValue(undefined),
    });

    await flush();
    expect(connectMock).toHaveBeenCalledWith('amqp://localhost', { heartbeat: 15 });
  });

  it('applies exponential backoff bounded by maxDelayMs, and resets attempt count after success', async () => {
    vi.useFakeTimers();
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5); // fixed jitter multiplier of 1.0

    connectMock
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockRejectedValueOnce(new Error('fail 3'))
      .mockResolvedValueOnce(new FakeConnection())
      .mockResolvedValueOnce(new FakeConnection());

    const managed = connectManaged({
      url: 'amqp://localhost',
      serviceName: 'test-service',
      logger: silentLogger(),
      retry: { initialDelayMs: 1_000, maxDelayMs: 30_000 },
      setup: vi.fn().mockResolvedValue(undefined),
    });

    await vi.advanceTimersByTimeAsync(0);
    expect(connectMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(999);
    expect(connectMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(connectMock).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(1_999);
    expect(connectMock).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(connectMock).toHaveBeenCalledTimes(3);

    await vi.advanceTimersByTimeAsync(4_000);
    expect(connectMock).toHaveBeenCalledTimes(4);
    expect(managed.isReady()).toBe(true);

    // A successful setup resets the attempt counter, so the next failure
    // backs off from the initial delay again, not from attempt 3.
    managed.getConnection()?.emit('close');
    expect(managed.isReady()).toBe(false);

    await vi.advanceTimersByTimeAsync(999);
    expect(connectMock).toHaveBeenCalledTimes(4);
    await vi.advanceTimersByTimeAsync(1);
    expect(connectMock).toHaveBeenCalledTimes(5);
    expect(managed.isReady()).toBe(true);

    randomSpy.mockRestore();
  });
});
