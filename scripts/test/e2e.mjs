/**
 * E2E smoke — test gateway + companies API + optional frontend on :25173.
 * Uses fetch (not supertest). Playwright can be added for browser flows later.
 */
import { TEST_FRONTEND_PORT } from '../dev/port-registry.mjs';
import { registerCleanup, registerSignalHandlers, runCleanup } from '../process/signals.mjs';
import { parsePublicCompanies } from './api-helpers.mjs';
import {
  downTestStack,
  migrateTestDb,
  seedTestFixtures,
  startTestFrontend,
  startTestService,
  TEST_GATEWAY_BASE,
  upTestStack,
  waitGatewayPing,
  waitHttpOk,
} from './stack.mjs';

async function assertGatewayCors() {
  const res = await fetch(`${TEST_GATEWAY_BASE}/companies/public`, {
    method: 'OPTIONS',
    headers: {
      Origin: `http://localhost:${TEST_FRONTEND_PORT}`,
      'Access-Control-Request-Method': 'GET',
    },
  });
  const allowOrigin = res.headers.get('access-control-allow-origin');
  if (allowOrigin !== `http://localhost:${TEST_FRONTEND_PORT}`) {
    throw new Error(`CORS allow-origin mismatch: ${allowOrigin}`);
  }
  console.log('[test:e2e] gateway CORS for test frontend OK');
}

async function assertCompaniesPublic() {
  const res = await fetch(`${TEST_GATEWAY_BASE}/companies/public`);
  if (!res.ok) throw new Error(`/companies/public → ${res.status}`);
  const companies = parsePublicCompanies(await res.json());
  if (companies.length < 2) {
    throw new Error(`expected ≥2 published companies, got ${companies.length}`);
  }
  console.log(`[test:e2e] /companies/public → ${companies.length} companies`);
}

async function assertFrontendDevServer() {
  const port = startTestFrontend();
  const ok = await waitHttpOk(`http://localhost:${port}/`, 'test frontend');
  if (!ok) throw new Error('frontend dev server not reachable');
}

async function main() {
  registerSignalHandlers();
  registerCleanup(async () => downTestStack());

  try {
    console.log('[test:e2e] starting isolated test stack…');
    upTestStack();
    const gw = await waitGatewayPing();
    if (!gw) throw new Error('test gateway ping failed');

    migrateTestDb();
    seedTestFixtures();

    const port = startTestService('companies');
    const ready = await waitHttpOk(`http://localhost:${port}/health/ready`, 'companies-service');
    if (!ready) throw new Error('companies-service not ready');

    await assertCompaniesPublic();
    await assertGatewayCors();
    await assertFrontendDevServer();

    console.log('[test:e2e] passed');
  } finally {
    await runCleanup();
  }
}

main().catch(async (err) => {
  console.error(err);
  await runCleanup();
  process.exit(1);
});
