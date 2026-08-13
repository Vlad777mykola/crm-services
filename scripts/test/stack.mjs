/**
 * Shared lifecycle for docker/test stack + optional host services on test ports.
 */
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { OUTBOX, SERVICES } from '../dev/bundles.mjs';
import {
  TEST_FRONTEND_PORT,
  TEST_GATEWAY_PORT,
  TEST_PROJECT,
  testAppPort,
} from '../dev/port-registry.mjs';
import { mergeTestEnv } from '../dev/test-env.mjs';
import { spawnTracked, removeTrackedPid } from '../process/spawn.mjs';
import { terminateTree } from '../process/terminate-tree.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const COMPOSE_FILE = path.join(ROOT, 'docker/test/compose.yml');
const GENERATE_TRAEFIK = path.join(ROOT, 'scripts/test/generate-test-traefik.mjs');

const READINESS_TIMEOUT_MS = 120000;
const POLL_MS = 500;

/** @type {Array<{ name: string; pid: number }>} */
const spawned = [];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function generateTestTraefik() {
  execSync(`node "${GENERATE_TRAEFIK}"`, { cwd: ROOT, stdio: 'inherit' });
}

export function upTestStack() {
  generateTestTraefik();
  execSync(`docker compose -p ${TEST_PROJECT} -f "${COMPOSE_FILE}" up -d --wait`, {
    cwd: ROOT,
    stdio: 'inherit',
  });
}

export function downTestStack() {
  stopSpawnedServices();
  try {
    execSync(`docker compose -p ${TEST_PROJECT} -f "${COMPOSE_FILE}" down -v --remove-orphans`, {
      cwd: ROOT,
      stdio: 'inherit',
    });
  } catch {
    // ignore teardown errors
  }
}

export function migrateTestDb() {
  execSync('node scripts/db/migrate.mjs --target test', {
    cwd: ROOT,
    stdio: 'inherit',
  });
}

export function seedTestCompanies() {
  execSync('node scripts/db/seed.mjs companies:reset --target test', {
    cwd: ROOT,
    stdio: 'inherit',
  });
}

export function seedTestFixtures() {
  execSync('node scripts/db/seed.mjs test --target test', {
    cwd: ROOT,
    stdio: 'inherit',
  });
}

/** @param {string} serviceId */
export function startTestService(serviceId) {
  const svc = SERVICES[serviceId];
  const port = testAppPort(svc.port);
  const envExtra =
    serviceId === 'notifications' ? { HEALTH_PORT: String(port) } : { PORT: String(port) };
  const child = spawnTracked({
    name: `test-${serviceId}`,
    command: 'yarn dev',
    cwd: path.join(ROOT, svc.dir),
    env: mergeTestEnv(envExtra),
    stdio: 'ignore',
  });
  spawned.push({ name: `test-${serviceId}`, pid: child.pid });
  return port;
}

/** @param {string} outboxId */
export function startTestOutbox(outboxId) {
  const ob = OUTBOX[outboxId];
  const port = testAppPort(ob.healthPort);
  const child = spawnTracked({
    name: `test-outbox-${outboxId}`,
    command: 'yarn dev',
    cwd: path.join(ROOT, 'services/outbox-publisher'),
    env: mergeTestEnv({ OUTBOX_SCHEMA: ob.schema, HEALTH_PORT: String(port) }),
    stdio: 'ignore',
  });
  spawned.push({ name: `test-outbox-${outboxId}`, pid: child.pid });
  return port;
}

export function startTestFrontend() {
  const command = `yarn workspace @crm/frontend dev -- --port ${TEST_FRONTEND_PORT} --strictPort`;
  const child = spawnTracked({
    name: 'test-frontend',
    command,
    cwd: ROOT,
    env: mergeTestEnv({ VITE_API_URL: `http://localhost:${TEST_GATEWAY_PORT}` }),
    stdio: 'ignore',
  });
  spawned.push({ name: 'test-frontend', pid: child.pid });
  return TEST_FRONTEND_PORT;
}

export function stopSpawnedServices() {
  for (const entry of spawned) {
    try {
      terminateTree(entry.pid);
    } catch {
      // ignore
    }
    removeTrackedPid(entry.name);
  }
  spawned.length = 0;
}

if (process.argv[2] === 'stop-services') {
  stopSpawnedServices();
  process.exit(0);
}

export async function waitHttpOk(url, label) {
  const deadline = Date.now() + READINESS_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        console.log(`✓ ${label}`);
        return true;
      }
    } catch {
      // retry
    }
    await sleep(POLL_MS);
  }
  console.error(`✗ ${label} — timeout (${url})`);
  return false;
}

export async function waitGatewayPing() {
  return waitHttpOk(`http://localhost:${TEST_GATEWAY_PORT}/ping`, 'test gateway ping');
}

export const TEST_GATEWAY_BASE = `http://localhost:${TEST_GATEWAY_PORT}`;
