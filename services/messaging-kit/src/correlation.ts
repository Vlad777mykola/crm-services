import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';

const REQUEST_ID_HEADER = 'x-request-id';
const REQUEST_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** HTTP boundary: valid X-Request-Id becomes correlationId; otherwise generate. */
export function resolveCorrelationId(req: IncomingMessage): string {
  const incoming = req.headers[REQUEST_ID_HEADER];
  const candidate = (Array.isArray(incoming) ? incoming[0] : incoming)?.trim();
  if (candidate && REQUEST_ID_PATTERN.test(candidate)) {
    return candidate;
  }
  return randomUUID();
}

export interface ChainedEventContext {
  correlationId: string;
  causationId: string;
}

export function chainFromIncomingEvent(envelope: { id: string; correlationId?: string | null }): ChainedEventContext {
  return {
    correlationId: envelope.correlationId ?? randomUUID(),
    causationId: envelope.id,
  };
}
