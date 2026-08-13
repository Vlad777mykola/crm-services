/**
 * Production-parity smoke — build images, disposable DB, health checks, teardown.
 */
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { registerCleanup, registerSignalHandlers, runCleanup } from '../process/signals.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PROD = path.join(ROOT, 'docker/prod/compose.yml');
const SMOKE = path.join(ROOT, 'docker/smoke/compose.override.yml');
const PROJECT = 'crm-smoke';

function down() {
  try {
    execSync(`docker compose -p ${PROJECT} -f "${PROD}" -f "${SMOKE}" down -v --remove-orphans`, {
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
    console.log('[smoke:prod] starting prod-parity stack with smoke overrides…');
    execSync(`docker compose -p ${PROJECT} -f "${PROD}" -f "${SMOKE}" up -d --wait`, {
      cwd: ROOT,
      stdio: 'inherit',
    });
    console.log('[smoke:prod] stack up — extend with image build + migrate + API smoke tests');
  } finally {
    await runCleanup();
  }
}

main().catch(async (err) => {
  console.error(err);
  await runCleanup();
  process.exit(1);
});
