/**
 * Production-parity smoke — build companies-service image, disposable DB, API check, teardown.
 */
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { JWT_ACCESS_SECRET, SMOKE_DATABASE_URL, SMOKE_GATEWAY_PORT, SMOKE_PROJECT } from '../dev/port-registry.mjs';
import { registerCleanup, registerSignalHandlers, runCleanup } from '../process/signals.mjs';
import { parsePublicCompanies } from '../test/api-helpers.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const COMPOSE = path.join(ROOT, 'docker/smoke/compose.yml');
const GATEWAY_BASE = `http://localhost:${SMOKE_GATEWAY_PORT}`;

function down() {
  try {
    execSync(`docker compose -p ${SMOKE_PROJECT} -f "${COMPOSE}" down -v --remove-orphans`, {
      cwd: ROOT,
      stdio: 'inherit',
    });
  } catch {
    // ignore
  }
}

function migrateSmokeDb() {
  execSync('yarn workspace @crm/fill-dump-db run migrate', {
    cwd: ROOT,
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: SMOKE_DATABASE_URL,
      JWT_ACCESS_SECRET,
    },
  });
}

function seedSmokeCompanies() {
  execSync('yarn workspace @crm/fill-dump-db run seed:companies:reset', {
    cwd: ROOT,
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: SMOKE_DATABASE_URL,
      JWT_ACCESS_SECRET,
    },
  });
}

async function assertCompaniesPublic() {
  const res = await fetch(`${GATEWAY_BASE}/companies/public`);
  if (!res.ok) {
    throw new Error(`GET /companies/public failed: ${res.status} ${res.statusText}`);
  }
  const companies = parsePublicCompanies(await res.json());
  if (companies.length < 1) {
    throw new Error('expected ≥1 published company through prod gateway');
  }
  console.log(`[smoke:prod] GET /companies/public → ${companies.length} companies`);
}

async function main() {
  registerSignalHandlers();
  registerCleanup(async () => down());

  try {
    console.log('[smoke:prod] building companies-service production image…');
    execSync(`docker compose -p ${SMOKE_PROJECT} -f "${COMPOSE}" build companies-service`, {
      cwd: ROOT,
      stdio: 'inherit',
    });

    console.log('[smoke:prod] starting minimal prod-parity stack…');
    execSync(`docker compose -p ${SMOKE_PROJECT} -f "${COMPOSE}" up -d --wait`, {
      cwd: ROOT,
      stdio: 'inherit',
    });

    const ping = await fetch(`${GATEWAY_BASE}/ping`);
    if (!ping.ok) throw new Error('smoke gateway ping failed');

    migrateSmokeDb();
    seedSmokeCompanies();
    await assertCompaniesPublic();

    console.log('[smoke:prod] passed');
  } finally {
    await runCleanup();
  }
}

main().catch(async (err) => {
  console.error(err);
  await runCleanup();
  process.exit(1);
});
