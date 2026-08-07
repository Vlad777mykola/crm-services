export interface RecordMessageInput {
  eventType: string;
  exchange: string;
  /** Epoch ms the event was originally emitted, if known - used for latency. */
  emittedAtMs?: number | null;
}

export interface MetricsSnapshot {
  serviceName: string;
  totalMessages: number;
  totalErrors: number;
  startedAt: number;
  lastMessageAt: number | null;
  byEventType: Record<string, number>;
  byExchange: Record<string, number>;
  lastLatencyMs: number | null;
  averageLatencyMs: number | null;
}

/**
 * Pure, in-memory counters for "how is RabbitMQ traffic looking" - no
 * RabbitMQ/HTTP concerns, so it's trivially unit-testable. main.ts feeds it
 * from consumer callbacks and serves `snapshot()` (or
 * `renderPrometheusMetrics(snapshot())`) over its own tiny HTTP server.
 */
export class RabbitMqMetricsStore {
  private totalMessages = 0;
  private totalErrors = 0;
  private readonly startedAt: number;
  private lastMessageAt: number | null = null;
  private readonly byEventType = new Map<string, number>();
  private readonly byExchange = new Map<string, number>();
  private lastLatencyMs: number | null = null;
  private latencySumMs = 0;
  private latencyCount = 0;

  constructor(
    private readonly serviceName: string,
    private readonly now: () => number = Date.now,
  ) {
    this.startedAt = this.now();
  }

  recordMessage(input: RecordMessageInput): void {
    this.totalMessages += 1;
    this.lastMessageAt = this.now();
    this.byEventType.set(input.eventType, (this.byEventType.get(input.eventType) ?? 0) + 1);
    this.byExchange.set(input.exchange, (this.byExchange.get(input.exchange) ?? 0) + 1);

    if (input.emittedAtMs != null && !Number.isNaN(input.emittedAtMs)) {
      const latency = Math.max(0, this.now() - input.emittedAtMs);
      this.lastLatencyMs = latency;
      this.latencySumMs += latency;
      this.latencyCount += 1;
    }
  }

  recordError(): void {
    this.totalErrors += 1;
  }

  snapshot(): MetricsSnapshot {
    return {
      serviceName: this.serviceName,
      totalMessages: this.totalMessages,
      totalErrors: this.totalErrors,
      startedAt: this.startedAt,
      lastMessageAt: this.lastMessageAt,
      byEventType: Object.fromEntries(this.byEventType),
      byExchange: Object.fromEntries(this.byExchange),
      lastLatencyMs: this.lastLatencyMs,
      averageLatencyMs: this.latencyCount > 0 ? this.latencySumMs / this.latencyCount : null,
    };
  }
}

/** Prometheus text-exposition format (v0.0.4) for a metrics snapshot. */
export function renderPrometheusMetrics(snapshot: MetricsSnapshot, now: number = Date.now()): string {
  const { serviceName } = snapshot;
  const lines: string[] = [];

  lines.push('# HELP rabbitmq_messages_consumed_total Total messages consumed from RabbitMQ.');
  lines.push('# TYPE rabbitmq_messages_consumed_total counter');
  lines.push(`rabbitmq_messages_consumed_total{service="${serviceName}"} ${snapshot.totalMessages}`);

  lines.push('# HELP rabbitmq_messages_consumed_by_type_total Messages consumed, broken down by event type.');
  lines.push('# TYPE rabbitmq_messages_consumed_by_type_total counter');
  for (const [eventType, count] of Object.entries(snapshot.byEventType)) {
    lines.push(`rabbitmq_messages_consumed_by_type_total{service="${serviceName}",event_type="${eventType}"} ${count}`);
  }

  lines.push('# HELP rabbitmq_messages_consumed_by_exchange_total Messages consumed, broken down by source exchange.');
  lines.push('# TYPE rabbitmq_messages_consumed_by_exchange_total counter');
  for (const [exchange, count] of Object.entries(snapshot.byExchange)) {
    lines.push(`rabbitmq_messages_consumed_by_exchange_total{service="${serviceName}",exchange="${exchange}"} ${count}`);
  }

  lines.push('# HELP rabbitmq_message_processing_errors_total Messages that failed processing and were dropped.');
  lines.push('# TYPE rabbitmq_message_processing_errors_total counter');
  lines.push(`rabbitmq_message_processing_errors_total{service="${serviceName}"} ${snapshot.totalErrors}`);

  lines.push('# HELP rabbitmq_consumer_uptime_seconds Seconds since this consumer process started.');
  lines.push('# TYPE rabbitmq_consumer_uptime_seconds gauge');
  lines.push(`rabbitmq_consumer_uptime_seconds{service="${serviceName}"} ${((now - snapshot.startedAt) / 1000).toFixed(3)}`);

  lines.push(
    '# HELP rabbitmq_message_latency_ms_last Latency (ms) between event emission and consumption, most recent message.',
  );
  lines.push('# TYPE rabbitmq_message_latency_ms_last gauge');
  lines.push(`rabbitmq_message_latency_ms_last{service="${serviceName}"} ${snapshot.lastLatencyMs ?? 0}`);

  lines.push('# HELP rabbitmq_message_latency_ms_average Average latency (ms) between event emission and consumption.');
  lines.push('# TYPE rabbitmq_message_latency_ms_average gauge');
  lines.push(`rabbitmq_message_latency_ms_average{service="${serviceName}"} ${snapshot.averageLatencyMs?.toFixed(3) ?? 0}`);

  return lines.join('\n') + '\n';
}
