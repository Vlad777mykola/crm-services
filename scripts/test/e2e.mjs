/**
 * E2E placeholder — runs integration stack lifecycle; extend with Playwright/fetch tests.
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
    execSync(`docker compose -p ${PROJECT} -f "${COMPOSE}" up -d --wait`, {
      cwd: ROOT,
      stdio: 'inherit',
    });
    const gw = await fetch('http://localhost:18080/ping').catch(() => null);
    if (!gw?.ok) {
      throw new Error('test gateway not reachable');
    }
    console.log('[test:e2e] gateway ping OK — add browser/API tests here');
  } finally {
    await runCleanup();
  }
}

main().catch(async (err) => {
  console.error(err);
  await runCleanup();
  process.exit(1);
});
