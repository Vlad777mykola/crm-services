#!/usr/bin/env node
/**
 * Verifies known consumer queue names match the documented service ownership map.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** @type {Record<string, string>} */
const EXPECTED = {
  'auth-service': 'auth-service.q',
  'users-service': 'users-service.q',
  'companies-service': 'companies-service.q',
  'company-members-service': 'company-members-service.q',
  'appointments-service': 'appointments-service.q',
  'notifications-service': 'notifications-service.q',
  'metrics-service': 'metrics-service.q',
};

async function main() {
  const violations = [];
  for (const [service, expectedQueue] of Object.entries(EXPECTED)) {
    const mainPath = path.join(root, 'services', service, 'src/main.ts');
    const text = await readFile(mainPath, 'utf8');
    const match = text.match(/QUEUE_NAME\s*=\s*['"]([^'"]+)['"]/);
    if (!match) {
      violations.push(`${service}: QUEUE_NAME not found`);
      continue;
    }
    if (match[1] !== expectedQueue) {
      violations.push(`${service}: expected ${expectedQueue}, got ${match[1]}`);
    }
  }

  if (violations.length > 0) {
    console.error('[check-rabbit-routing] violations:\n', violations.join('\n'));
    process.exit(1);
  }
  console.log('[check-rabbit-routing] ok');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
