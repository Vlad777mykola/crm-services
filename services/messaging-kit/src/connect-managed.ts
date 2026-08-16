import amqp, { type ChannelModel, type Options } from 'amqplib';

/**
 * `connectManaged` owns only the RabbitMQ TCP connection lifecycle: connect,
 * reconnect scheduling, backoff, close/error handling, readiness state,
 * graceful shutdown, and re-running `setup()` after a reconnect.
 *
 * It deliberately does NOT own queue/exchange declarations, bindings,
 * prefetch, consume(), ACK/NACK, retry republish, DLX behaviour, publisher
 * confirms, or mandatory/basic.return handling - all of that stays in each
 * service's `rabbitmq/` layer (see docs/architecture/event-driven-model.md).
 *
 * The callback is named `setup`, not `onConnected`, on purpose: "connected"
 * only means the TCP socket to the broker is open. `isReady()` (below) only
 * becomes true once `setup()` - create the channel, declare topology, bind,
 * set prefetch, start consuming - has fully completed. Conflating those two
 * was the root cause of the readiness bug this module fixes.
 */

export interface ConnectManagedRetryOptions {
  initialDelayMs?: number;
  maxDelayMs?: number;
  /** Backoff multiplier applied per attempt. Defaults to 2 (exponential). */
  factor?: number;
  /**
   * Fractional jitter applied around the computed delay, e.g. `0.4` spreads
   * the delay across roughly [delay * 0.8, delay * 1.2]. Defaults to `0.4`.
   * Useful so that many services reconnecting after a broker restart don't
   * all retry in lockstep.
   */
  jitter?: number;
}

export interface ManagedConnectionContext {
  /**
   * Declares the current RabbitMQ setup (channel/topology/consumer) no
   * longer usable and restarts the connect/setup cycle. Safe to call more
   * than once, and safe to call alongside connection-level close/error
   * events - only one reconnect cycle will result.
   */
  invalidate(reason?: unknown): void;
}

export interface ConnectManagedLogger {
  info: (objOrMsg: unknown, msg?: string) => void;
  warn: (objOrMsg: unknown, msg?: string) => void;
  error: (objOrMsg: unknown, msg?: string) => void;
}

export interface ConnectManagedOptions {
  url: string;
  serviceName: string;
  /**
   * Runs once per successful TCP connect, and again after every reconnect.
   * Should create the channel(s), declare topology, set prefetch, and start
   * consuming. `isReady()` only becomes true after this resolves.
   */
  setup: (connection: ChannelModel, context: ManagedConnectionContext) => Promise<void>;
  onDisconnected?: (reason?: unknown) => void;
  retry?: ConnectManagedRetryOptions;
  logger?: ConnectManagedLogger;
  /** Passed straight through to `amqplib.connect(url, connectionOptions)` (TLS, heartbeat, socket options, ...). */
  connectionOptions?: Options.Connect;
}

export interface ManagedConnection {
  /** True while the underlying TCP connection to the broker exists - NOT the same as ready. */
  isConnected(): boolean;
  /** True only once `setup()` has fully completed for the current connection. Use this for health checks. */
  isReady(): boolean;
  getConnection(): ChannelModel | null;
  close(): Promise<void>;
}

type RabbitMqState = 'disconnected' | 'connecting' | 'setting_up' | 'ready' | 'closing';

function consoleLog(level: 'info' | 'warn' | 'error', objOrMsg: unknown, msg?: string): void {
  const fn = level === 'info' ? console.log : level === 'warn' ? console.warn : console.error;
  if (msg !== undefined) {
    fn(msg, objOrMsg);
  } else {
    fn(objOrMsg);
  }
}

const defaultLogger: ConnectManagedLogger = {
  info: (objOrMsg, msg) => consoleLog('info', objOrMsg, msg),
  warn: (objOrMsg, msg) => consoleLog('warn', objOrMsg, msg),
  error: (objOrMsg, msg) => consoleLog('error', objOrMsg, msg),
};

function calculateBackoff(attempt: number, retry?: ConnectManagedRetryOptions): number {
  const initial = retry?.initialDelayMs ?? 1_000;
  const max = retry?.maxDelayMs ?? 30_000;
  const factor = retry?.factor ?? 2;
  const jitterRatio = retry?.jitter ?? 0.4;
  const base = Math.min(initial * factor ** attempt, max);
  const jitterMultiplier = 1 - jitterRatio / 2 + Math.random() * jitterRatio;
  return Math.round(base * jitterMultiplier);
}

/**
 * Owns the RabbitMQ TCP connection lifecycle for one service. See the
 * module doc comment above for the exact responsibility boundary.
 */
export function connectManaged(options: ConnectManagedOptions): ManagedConnection {
  const log = options.logger ?? defaultLogger;

  let state: RabbitMqState = 'disconnected';
  let connection: ChannelModel | null = null;
  let closed = false;
  let attempt = 0;
  let reconnectTimer: NodeJS.Timeout | null = null;

  function isConnected(): boolean {
    return connection !== null;
  }

  function isReady(): boolean {
    return state === 'ready';
  }

  function getConnection(): ChannelModel | null {
    return connection;
  }

  function scheduleReconnect(reason?: unknown): void {
    if (closed) {
      return;
    }
    if (reconnectTimer) {
      return;
    }

    state = 'disconnected';
    options.onDisconnected?.(reason);

    const delay = calculateBackoff(attempt++, options.retry);
    log.warn(
      { serviceName: options.serviceName, attempt, delayMs: delay, reason },
      'RabbitMQ reconnect scheduled',
    );

    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      void connectOnce();
    }, delay);
  }

  /**
   * Declares the current connection/setup invalid: closes it (if any) and
   * schedules a reconnect. Idempotent - safe to call from multiple failure
   * signals (channel close, connection close, republish failure) without
   * producing more than one reconnect cycle.
   */
  async function invalidateConnection(reason?: unknown): Promise<void> {
    if (closed) {
      return;
    }

    const current = connection;
    connection = null;
    state = 'disconnected';

    if (current) {
      await current.close().catch(() => {});
    }

    scheduleReconnect(reason);
  }

  async function connectOnce(): Promise<void> {
    if (closed) {
      return;
    }

    state = 'connecting';
    log.info({ serviceName: options.serviceName }, 'RabbitMQ connecting');

    let current: ChannelModel;
    try {
      current = await amqp.connect(options.url, options.connectionOptions);
    } catch (err) {
      log.warn({ serviceName: options.serviceName, err }, 'RabbitMQ connect failed');
      scheduleReconnect(err);
      return;
    }

    if (closed) {
      await current.close().catch(() => {});
      return;
    }

    connection = current;
    state = 'setting_up';
    log.info({ serviceName: options.serviceName }, 'RabbitMQ connected');

    current.once('close', () => {
      if (closed) {
        return;
      }
      if (connection !== current) {
        // Stale event from a connection we already replaced/invalidated.
        return;
      }
      connection = null;
      log.warn({ serviceName: options.serviceName }, 'RabbitMQ connection closed');
      scheduleReconnect(new Error('RabbitMQ connection closed'));
    });

    current.on('error', (err: unknown) => {
      log.warn({ serviceName: options.serviceName, err }, 'RabbitMQ connection error');
    });

    const context: ManagedConnectionContext = {
      invalidate: (reason?: unknown) => {
        if (connection !== current) {
          // Stale setup context — a newer connection already replaced this one,
          // or we already tore this connection down. Ignore delayed channel-close
          // events from the old channel so they cannot kill the new connection.
          return;
        }
        log.warn({ serviceName: options.serviceName, reason }, 'RabbitMQ setup invalidated');
        void invalidateConnection(reason);
      },
    };

    try {
      await options.setup(current, context);
    } catch (err) {
      log.warn({ serviceName: options.serviceName, err }, 'RabbitMQ setup failed');
      if (connection === current) {
        connection = null;
      }
      await current.close().catch(() => {});
      scheduleReconnect(err);
      return;
    }

    if (closed || connection !== current) {
      // Superseded by a reconnect that happened during setup - do not mark
      // ready and do not schedule a second reconnect cycle.
      return;
    }

    attempt = 0;
    state = 'ready';
    log.info({ serviceName: options.serviceName }, 'RabbitMQ setup completed');
  }

  async function close(): Promise<void> {
    if (closed) {
      return;
    }
    closed = true;
    state = 'closing';
    log.info({ serviceName: options.serviceName }, 'RabbitMQ shutting down');

    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    const current = connection;
    connection = null;

    if (current) {
      await current.close().catch(() => {});
    }
  }

  void connectOnce();

  return { isConnected, isReady, getConnection, close };
}
