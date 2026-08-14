#!/usr/bin/env node
/**
 * Event catalog ↔ contracts alignment (subset of check-messaging, runnable standalone).
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const contractsDir = path.join(root, 'contracts/events');
const catalogPath = path.join(root, 'docs/architecture/event-catalog.md');

async function main() {
  const catalog = await readFile(catalogPath, 'utf8');
  const files = await readdir(contractsDir);
  const eventTypes = files
    .filter((f) => f.endsWith('.v1.json') && f !== 'envelope.v1.json')
    .map((f) => f.replace('.v1.json', ''));

  const violations = [];
  for (const eventType of eventTypes) {
    if (!catalog.includes(eventType)) {
      violations.push(`event-catalog.md missing ${eventType}`);
    }
  }

  if (violations.length > 0) {
    console.error('[check-event-catalog] violations:\n', violations.join('\n'));
    process.exit(1);
  }
  console.log('[check-event-catalog] ok');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
