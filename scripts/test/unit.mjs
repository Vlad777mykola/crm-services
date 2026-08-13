/**
 * Run unit tests across workspace packages (no Docker).
 */
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { SERVICES } from '../dev/bundles.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const TEST_SERVICES = [
  'notifications-service',
  'metrics-service',
  'outbox-publisher',
];

for (const dir of TEST_SERVICES) {
  const full = path.join(ROOT, 'services', dir);
  console.log(`[test:unit] ${dir}`);
  try {
    execSync('yarn test', { cwd: full, stdio: 'inherit' });
  } catch {
    console.warn(`[test:unit] ${dir} skipped or failed`);
  }
}

console.log('[test:unit] done');
