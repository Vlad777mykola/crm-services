import { describe, expect, it } from 'vitest';

import { RabbitMqMetricsStore, renderPrometheusMetrics } from './store.js';

describe('RabbitMqMetricsStore', () => {
  it('starts empty', () => {
    const store = new RabbitMqMetricsStore('test-service', () => 1_000);
    const snapshot = store.snapshot();

    expect(snapshot.totalMessages).toBe(0);
    expect(snapshot.totalErrors).toBe(0);
    expect(snapshot.lastMessageAt).toBeNull();
    expect(snapshot.lastLatencyMs).toBeNull();
    expect(snapshot.averageLatencyMs).toBeNull();
    expect(snapshot.byEventType).toEqual({});
    expect(snapshot.byExchange).toEqual({});
  });

  it('tallies messages by event type and exchange', () => {
    const store = new RabbitMqMetricsStore('test-service');
    store.recordMessage({ eventType: 'appointment.requested', exchange: 'domain.events' });
    store.recordMessage({ eventType: 'appointment.requested', exchange: 'domain.events' });
    store.recordMessage({ eventType: 'review.received', exchange: 'domain.events' });
    store.recordMessage({ eventType: 'analytics.company_rating_updated', exchange: 'analytics.events' });

    const snapshot = store.snapshot();
    expect(snapshot.totalMessages).toBe(4);
    expect(snapshot.byEventType).toEqual({
      'appointment.requested': 2,
      'review.received': 1,
      'analytics.company_rating_updated': 1,
    });
    expect(snapshot.byExchange).toEqual({ 'domain.events': 3, 'analytics.events': 1 });
  });

  it('tracks last and average latency when the emission time is known', () => {
    let currentTime = 1_000;
    const store = new RabbitMqMetricsStore('test-service', () => currentTime);

    store.recordMessage({ eventType: 'a', exchange: 'domain.events', emittedAtMs: currentTime - 100 });
    currentTime = 2_000;
    store.recordMessage({ eventType: 'a', exchange: 'domain.events', emittedAtMs: currentTime - 300 });

    const snapshot = store.snapshot();
    expect(snapshot.lastLatencyMs).toBe(300);
    expect(snapshot.averageLatencyMs).toBe(200);
  });

  it('ignores latency entirely when the emission time is unknown', () => {
    const store = new RabbitMqMetricsStore('test-service');
    store.recordMessage({ eventType: 'a', exchange: 'domain.events' });

    const snapshot = store.snapshot();
    expect(snapshot.lastLatencyMs).toBeNull();
    expect(snapshot.averageLatencyMs).toBeNull();
  });

  it('counts errors separately from messages', () => {
    const store = new RabbitMqMetricsStore('test-service');
    store.recordError();
    store.recordError();

    expect(store.snapshot().totalErrors).toBe(2);
    expect(store.snapshot().totalMessages).toBe(0);
  });
});

describe('renderPrometheusMetrics', () => {
  it('renders counters, gauges, and labels in Prometheus text format', () => {
    const store = new RabbitMqMetricsStore('test-service', () => 5_000);
    store.recordMessage({ eventType: 'appointment.requested', exchange: 'domain.events', emittedAtMs: 4_500 });
    store.recordError();

    const text = renderPrometheusMetrics(store.snapshot(), 5_000);

    expect(text).toContain('rabbitmq_messages_consumed_total{service="test-service"} 1');
    expect(text).toContain(
      'rabbitmq_messages_consumed_by_type_total{service="test-service",event_type="appointment.requested"} 1',
    );
    expect(text).toContain(
      'rabbitmq_messages_consumed_by_exchange_total{service="test-service",exchange="domain.events"} 1',
    );
    expect(text).toContain('rabbitmq_message_processing_errors_total{service="test-service"} 1');
    expect(text).toContain('rabbitmq_message_latency_ms_last{service="test-service"} 500');
    expect(text).toContain('rabbitmq_message_latency_ms_average{service="test-service"} 500.000');
  });
});
