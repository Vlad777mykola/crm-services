/**
 * Integration tests — isolated docker/test stack, disposable DB on :15432.
 * Never touches dev postgres (:5432) or verify (:25432).
 */
import { registerCleanup, registerSignalHandlers, runCleanup } from '../process/signals.mjs';
import { parsePublicCompanies } from './api-helpers.mjs';
import {
  downTestStack,
  migrateTestDb,
  seedTestCompanies,
  startTestService,
  TEST_GATEWAY_BASE,
  upTestStack,
  waitGatewayPing,
  waitHttpOk,
} from './stack.mjs';

async function assertCompaniesPublic() {
  const url = `${TEST_GATEWAY_BASE}/companies/public`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`GET /companies/public failed: ${res.status} ${res.statusText}`);
  }
  const body = await res.json();
  const companies = parsePublicCompanies(body);
  if (companies.length < 1) {
    throw new Error(`Expected ≥1 published company, got: ${JSON.stringify(body)}`);
  }
  const names = companies.map((c) => c.name).join(', ');
  console.log(`[test:integration] GET /companies/public → ${companies.length} companies (${names})`);
}

async function assertPostgresConnectivity() {
  const ok = await waitHttpOk(`${TEST_GATEWAY_BASE}/ping`, 'gateway before DB check');
  if (!ok) throw new Error('gateway not ready');
  console.log('[test:integration] postgres :15432 reachable via migrate + seed');
}

async function main() {
  registerSignalHandlers();
  registerCleanup(async () => downTestStack());

  try {
    console.log('[test:integration] starting isolated test stack…');
    upTestStack();
    await assertPostgresConnectivity();

    migrateTestDb();
    seedTestCompanies();

    const port = startTestService('companies');
    const ready = await waitHttpOk(`http://localhost:${port}/health/ready`, 'companies-service');
    if (!ready) throw new Error('companies-service not ready');

    await assertCompaniesPublic();
    console.log('[test:integration] passed');
  } finally {
    await runCleanup();
  }
}

main().catch(async (err) => {
  console.error(err);
  await runCleanup();
  process.exit(1);
});
