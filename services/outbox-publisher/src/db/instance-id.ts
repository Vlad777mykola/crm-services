import { hostname } from 'node:os';
import { randomUUID } from 'node:crypto';

/** Stable runtime identity for outbox lease diagnostics and logs. */
export const PUBLISHER_INSTANCE_ID = `${hostname()}/${process.pid}/${randomUUID()}`;
