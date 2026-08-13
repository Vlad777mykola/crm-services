#!/usr/bin/env node
/**
 * Operational messaging CLI (RFC1 step 9).
 *
 * Usage:
 *   node scripts/messaging/cli.mjs dlq:list
 *   node scripts/messaging/cli.mjs dlq:peek --queue users.dead.q --limit 1
 *   node scripts/messaging/cli.mjs dlq:replay --queue users.domain.parking.q --limit 1
 *   node scripts/messaging/cli.mjs outbox:retry-failed --schema auth_schema --confirm YES
 */
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const RABBIT_MGMT = process.env.RABBITMQ_MANAGEMENT_URL ?? 'http://crm:crm_local_only@localhost:15672/api';
const command = process.argv[2];

async function mgmt(path, options = {}) {
  const response = await fetch(`${RABBIT_MGMT}${path}`, options);
  if (!response.ok) {
    throw new Error(`RabbitMQ management API ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

async function dlqList() {
  const queues = await mgmt('/queues');
  const deadOrParking = queues.filter((q) => q.name.includes('dead') || q.name.includes('parking') || q.name.includes('retry'));
  for (const q of deadOrParking.sort((a, b) => a.name.localeCompare(b.name))) {
    console.log(`${q.name}\tready=${q.messages_ready}\tunacked=${q.messages_unacknowledged}\tconsumers=${q.consumers}`);
  }
}

async function dlqPeek(queue, limit = 1) {
  console.warn('[messaging:dlq:peek] DEV/TROUBLESHOOTING ONLY — fetches and requeues messages (mutates queue state)');
  const payload = {
    count: limit,
    ackmode: 'ack_requeue_true',
    encoding: 'auto',
    truncate: 50_000,
  };
  const messages = await mgmt(`/queues/%2F/${encodeURIComponent(queue)}/get`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  console.log(JSON.stringify(messages, null, 2));
}

async function dlqReplay(queue, limit = 1, resetRetryCount = false) {
  console.warn('[messaging:dlq:replay] consumes parking messages and republishes to original exchange/routing key');
  const messages = await mgmt(`/queues/%2F/${encodeURIComponent(queue)}/get`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ count: limit, ackmode: 'ack_requeue_false', encoding: 'auto' }),
  });

  for (const entry of messages) {
    if (!entry) continue;
    const headers = entry.payload_bytes ? JSON.parse(entry.payload_bytes) : null;
    const props = entry.properties ?? {};
    const originalExchange = props.headers?.['x-original-exchange'] ?? entry.exchange;
    const originalRoutingKey = props.headers?.['x-original-routing-key'] ?? entry.routing_key;
    const replayHeaders = {
      ...(props.headers ?? {}),
      'x-replay-count': Number(props.headers?.['x-replay-count'] ?? 0) + 1,
      'x-replayed-at': new Date().toISOString(),
      'x-replay-reason': 'operator replay',
    };
    if (resetRetryCount) {
      replayHeaders['x-retry-count'] = 0;
    }

    // Management API cannot publish with confirms; operators should verify routing separately in prod.
    await mgmt('/exchanges/%2F/' + encodeURIComponent(originalExchange) + '/publish', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        properties: {
          ...props,
          headers: replayHeaders,
          delivery_mode: 2,
        },
        routing_key: originalRoutingKey,
        payload: entry.payload,
        payload_encoding: 'string',
      }),
    });
    console.log(`replayed message to ${originalExchange} / ${originalRoutingKey}`);
  }
}

async function outboxRetryFailed(schema, confirm) {
  if (confirm !== 'YES') {
    throw new Error('outbox:retry-failed requires --confirm YES');
  }
  console.log(`[messaging:outbox:retry-failed] reset failed rows in ${schema}.outbox_events to pending (operator action)`);
  console.log('Run against postgres with:');
  console.log(`  UPDATE "${schema}"."outbox_events" SET status='pending', attempts=0, "nextRetryAt"=now() WHERE status='failed';`);
}

async function main() {
  const args = process.argv.slice(3);
  const getArg = (name) => {
    const idx = args.indexOf(name);
    return idx >= 0 ? args[idx + 1] : undefined;
  };

  switch (command) {
    case 'dlq:list':
      await dlqList();
      break;
    case 'dlq:peek':
      await dlqPeek(getArg('--queue'), Number(getArg('--limit') ?? 1));
      break;
    case 'dlq:replay':
      await dlqReplay(getArg('--queue'), Number(getArg('--limit') ?? 1), args.includes('--reset-retry-count'));
      break;
    case 'outbox:retry-failed':
      await outboxRetryFailed(getArg('--schema'), getArg('--confirm'));
      break;
    default:
      console.log('Commands: dlq:list | dlq:peek | dlq:replay | outbox:retry-failed');
      process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
