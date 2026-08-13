/**
 * Integration tests with isolated docker/test stack.
 */
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { registerCleanup, registerSignalHandlers, runCleanup } from '../process/signals.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const COMPOSE = path.join(ROOT, 'docker/test/compose.yml');
const PROJECT = 'crm-test';

function down() {
  try {
    execSync(`docker compose -p ${PROJECT} -f "${COMPOSE}" down -v --remove-orphans`, {
      cwd: ROOT,
      stdio: 'inherit',
    });
  } catch {
    // ignore
  }
}

async function main() {
  registerSignalHandlers();
  registerCleanup(async () => down());

  try {
    console.log('[test:integration] starting test stack…');
    execSync(`docker compose -p ${PROJECT} -f "${COMPOSE}" up -d --wait`, {
      cwd: ROOT,
      stdio: 'inherit',
    });
    console.log('[test:integration] stack healthy — add service integration tests here');
  } finally {
    await runCleanup();
  }
}

main().catch(async (err) => {
  console.error(err);
  await runCleanup();
  process.exit(1);
});
