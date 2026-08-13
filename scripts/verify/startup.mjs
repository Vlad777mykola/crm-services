/**
 * yarn verify:startup — isolated disposable stack; proves all runnable components boot.
 * Never touches dev :5432 / :4001 / :5173.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { OUTBOX, SERVICES } from '../dev/bundles.mjs';
import {
  EXTRA_WORKERS,
  VERIFY_FRONTEND_PORT,
  VERIFY_GATEWAY_PORT,
  VERIFY_POSTGRES_PORT,
  VERIFY_PROJECT,
  VERIFY_RABBITMQ_MGMT_PORT,
  VERIFY_RABBITMQ_PORT,
  verifyAppPort,
} from '../dev/port-registry.mjs';
import {
  crossEnvVerify,
  frontendVerifyCommand,
  outboxVerifyEnv,
  serviceVerifyEnv,
  VERIFY_ENV,
} from '../dev/verify-env.mjs';
import { tsxCommand } from '../dev/tsx-runner.mjs';
import { clearTrackedPids, readTrackedPids, spawnTracked } from '../process/spawn.mjs';
import { registerCleanup, registerSignalHandlers, runCleanup } from '../process/signals.mjs';
import { terminateTree } from '../process/terminate-tree.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const COMPOSE_FILE = path.join(ROOT, 'docker/verify/compose.yml');
const READINESS_TIMEOUT_MS = 180000;
const POLL_MS = 500;

const SCHEMA_OWNERS = [
  'auth',
  'users',
  'companies',
  'company-members',
  'specialists',
  'company-specialists',
  'services-catalog',
  'appointments',
  'reviews',
  'notifications',
];

const EXPECTED_SCHEMAS = [
  'auth_schema',
  'users_schema',
  'companies_schema',
  'company_members_schema',
  'specialists_schema',
  'company_specialists_schema',
  'services_schema',
  'appointments_schema',
  'reviews_schema',
  'notifications_schema',
];

function dockerComposeExec(args, inherit = false) {
  return execSync(`docker compose -p ${VERIFY_PROJECT} -f "${COMPOSE_FILE}" ${args}`, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: inherit ? 'inherit' : 'pipe',
  });
}

function bootstrapPostgresAi() {
  const sqlPath = path.join(ROOT, 'services/ai-service/src/db/migrations/001_init.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  execSync(`docker compose -p ${VERIFY_PROJECT} -f "${COMPOSE_FILE}" exec -T postgres-ai psql -U ai -d ai`, {
    cwd: ROOT,
    input: sql,
    stdio: ['pipe', 'inherit', 'inherit'],
  });
  console.log('✓ postgres-ai bootstrap (001_init.sql)');
}

function checkRedis() {
  try {
    const out = dockerComposeExec('exec -T redis redis-cli ping').trim();
    if (out !== 'PONG') {
      console.error('✗ redis ping');
      return false;
    }
    console.log('✓ redis (internal)');
    return true;
  } catch {
    console.error('✗ redis ping');
    return false;
  }
}

function verifyDatabaseSchemas() {
  try {
    const out = dockerComposeExec(
      'exec -T postgres psql -U postgres -d crm -t -A -c "SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE \'%_schema\'"',
    );
    const found = new Set(out.trim().split('\n').filter(Boolean));
    const missing = EXPECTED_SCHEMAS.filter((s) => !found.has(s));
    if (missing.length > 0) {
      console.error(`✗ postgres schemas missing: ${missing.join(', ')}`);
      return false;
    }
    console.log(`✓ postgres schemas (${EXPECTED_SCHEMAS.length} microservice schemas on :${VERIFY_POSTGRES_PORT})`);
    return true;
  } catch (err) {
    console.error('✗ postgres schema verification', err);
    return false;
  }
}

async function checkRabbitmqTopology() {
  const auth = Buffer.from('crm:crm_local_only').toString('base64');
  try {
    const res = await fetch(`http://localhost:${VERIFY_RABBITMQ_MGMT_PORT}/api/exchanges/%2F/domain.events`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!res.ok) {
      console.error('✗ rabbitmq exchange domain.events');
      return false;
    }
    const queuesRes = await fetch(`http://localhost:${VERIFY_RABBITMQ_MGMT_PORT}/api/queues`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!queuesRes.ok) {
      console.error('✗ rabbitmq queues API');
      return false;
    }
    const queues = await queuesRes.json();
    const names = new Set(queues.map((q) => q.name));
    if (!names.has('users-service.q')) {
      console.error('✗ rabbitmq queue users-service.q (auth→outbox→users path)');
      return false;
    }
    console.log(`✓ rabbitmq topology (:${VERIFY_RABBITMQ_PORT} AMQP, users-service.q bound)`);
    return true;
  } catch {
    console.error('✗ rabbitmq topology');
    return false;
  }
}

function printStartupMatrix() {
  console.log('\n--- verify startup matrix (isolated ports) ---');
  console.log(`  postgres        :${VERIFY_POSTGRES_PORT}`);
  console.log(`  postgres-ai     :25433`);
  console.log(`  rabbitmq        :${VERIFY_RABBITMQ_PORT} (mgmt :${VERIFY_RABBITMQ_MGMT_PORT})`);
  console.log(`  gateway         :${VERIFY_GATEWAY_PORT}`);
  console.log(`  frontend        :${VERIFY_FRONTEND_PORT}`);
  for (const id of SCHEMA_OWNERS) {
    console.log(`  ${SERVICES[id].label.padEnd(22)} :${verifyAppPort(SERVICES[id].port)}`);
  }
  console.log(`  ${SERVICES.dashboard.label.padEnd(22)} :${verifyAppPort(SERVICES.dashboard.port)}`);
  for (const id of Object.keys(OUTBOX)) {
    console.log(`  outbox-${id.padEnd(16)} :${verifyAppPort(OUTBOX[id].healthPort)}`);
  }
  console.log(`  metrics-service       :${verifyAppPort(EXTRA_WORKERS.metrics.devPort)}`);
  console.log(`  ai-service            :${verifyAppPort(EXTRA_WORKERS.ai.devPort)}`);
  console.log('--- all components reported ready ---\n');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function dockerCompose(args, inherit = true) {
  execSync(`docker compose -p ${VERIFY_PROJECT} -f "${COMPOSE_FILE}" ${args}`, {
    cwd: ROOT,
    stdio: inherit ? 'inherit' : 'pipe',
  });
}

async function waitHealth(url, label) {
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

function startNodeService(serviceId) {
  const svc = SERVICES[serviceId];
  const envExtra = serviceVerifyEnv(serviceId);
  const command = `${crossEnvVerify(envExtra)} ${tsxCommand('src/main.ts')}`;
  spawnTracked({ name: serviceId, command, cwd: path.join(ROOT, svc.dir) });
}

function startOutbox(outboxId) {
  const envExtra = outboxVerifyEnv(outboxId);
  const command = `${crossEnvVerify(envExtra)} ${tsxCommand('src/main.ts')}`;
  spawnTracked({ name: `outbox-${outboxId}`, command, cwd: path.join(ROOT, 'services/outbox-publisher') });
}

async function checkGateway() {
  try {
    const ping = await fetch(`http://localhost:${VERIFY_GATEWAY_PORT}/ping`);
    if (!ping.ok) {
      console.error('✗ gateway liveness');
      return false;
    }
    console.log(`✓ gateway liveness :${VERIFY_GATEWAY_PORT}`);
  } catch {
    console.error('✗ gateway liveness');
    return false;
  }

  try {
    const route = await fetch(`http://localhost:${VERIFY_GATEWAY_PORT}/health`);
    if (!route.ok) {
      console.error('✗ gateway route → auth /health');
      return false;
    }
    console.log('✓ gateway route → auth /health');
  } catch {
    console.error('✗ gateway route → auth /health');
    return false;
  }

  try {
    const corsRes = await fetch(`http://localhost:${VERIFY_GATEWAY_PORT}/health`, {
      method: 'OPTIONS',
      headers: {
        Origin: `http://localhost:${VERIFY_FRONTEND_PORT}`,
        'Access-Control-Request-Method': 'GET',
      },
    });
    const allowOrigin = corsRes.headers.get('access-control-allow-origin') ?? '';
    if (!allowOrigin.includes(String(VERIFY_FRONTEND_PORT))) {
      console.error('✗ verify CORS (expected localhost:' + VERIFY_FRONTEND_PORT + ')');
      return false;
    }
    console.log(`✓ verify CORS :${VERIFY_FRONTEND_PORT}`);
  } catch {
    console.error('✗ verify CORS');
    return false;
  }

  return true;
}

async function main() {
  registerSignalHandlers();
  clearTrackedPids();

  registerCleanup(async () => {
    console.log('\n[verify:startup] cleaning up…');
    for (const entry of readTrackedPids()) {
      terminateTree(entry.rootPid);
    }
    clearTrackedPids();
    try {
      dockerCompose('down -v --remove-orphans', false);
    } catch {
      // stack may already be down
    }
  });

  console.log('\n[verify:startup] generating Traefik verify routes…');
  execSync('node scripts/verify/generate-verify-traefik.mjs', { cwd: ROOT, stdio: 'inherit' });

  console.log('\nInfrastructure');
  console.log('[verify:startup] starting isolated docker/verify stack…');
  dockerCompose('up -d --wait');

  console.log(`✓ postgres :${VERIFY_POSTGRES_PORT}`);
  console.log(`✓ rabbitmq :${VERIFY_RABBITMQ_PORT}`);
  console.log(`✓ postgres-ai :25433`);
  console.log(`✓ gateway :${VERIFY_GATEWAY_PORT}`);

  if (!checkRedis()) {
    await runCleanup();
    process.exit(1);
  }

  try {
    bootstrapPostgresAi();
  } catch (err) {
    console.error('✗ postgres-ai bootstrap', err);
    await runCleanup();
    process.exit(1);
  }

  console.log('\nServices (schema owners)');
  for (const id of SCHEMA_OWNERS) {
    startNodeService(id);
    const port = verifyAppPort(SERVICES[id].port);
    const ok = await waitHealth(
      `http://localhost:${port}/health/ready`,
      `${SERVICES[id].label} :${port}`,
    );
    if (!ok) {
      await runCleanup();
      process.exit(1);
    }
  }

  startNodeService('dashboard');
  const dashPort = verifyAppPort(SERVICES.dashboard.port);
  if (
    !(await waitHealth(
      `http://localhost:${dashPort}/health/ready`,
      `${SERVICES.dashboard.label} :${dashPort}`,
    ))
  ) {
    await runCleanup();
    process.exit(1);
  }

  if (!verifyDatabaseSchemas()) {
    await runCleanup();
    process.exit(1);
  }

  console.log('\nOutboxes');
  for (const id of Object.keys(OUTBOX)) {
    startOutbox(id);
    const port = verifyAppPort(OUTBOX[id].healthPort);
    const ok = await waitHealth(
      `http://localhost:${port}/health/ready`,
      `outbox-${id} :${port}`,
    );
    if (!ok) {
      await runCleanup();
      process.exit(1);
    }
  }

  if (!(await checkRabbitmqTopology())) {
    await runCleanup();
    process.exit(1);
  }

  console.log('\nWorkers');
  const metrics = EXTRA_WORKERS.metrics;
  const metricsPort = verifyAppPort(metrics.devPort);
  spawnTracked({
    name: 'metrics-service',
    command: `${crossEnvVerify({ METRICS_PORT: metricsPort })} ${tsxCommand('src/main.ts')}`,
    cwd: path.join(ROOT, metrics.dir),
  });
  if (
    !(await waitHealth(
      `http://localhost:${metricsPort}/health/ready`,
      `${metrics.label} :${metricsPort}`,
    ))
  ) {
    await runCleanup();
    process.exit(1);
  }

  const ai = EXTRA_WORKERS.ai;
  const aiPort = verifyAppPort(ai.devPort);
  spawnTracked({
    name: 'ai-service',
    command: 'python src/main.py',
    cwd: path.join(ROOT, ai.dir),
    env: {
      AI_DATABASE_URL: VERIFY_ENV.AI_DATABASE_URL,
      RABBITMQ_URL: VERIFY_ENV.RABBITMQ_URL,
      AI_SERVICE_HEALTH_PORT: String(aiPort),
    },
  });
  if (
    !(await waitHealth(
      `http://localhost:${aiPort}/health/ready`,
      `${ai.label} :${aiPort}`,
    ))
  ) {
    await runCleanup();
    process.exit(1);
  }

  console.log('\nGateway');
  if (!(await checkGateway())) {
    await runCleanup();
    process.exit(1);
  }

  spawnTracked({
    name: 'frontend',
    command: frontendVerifyCommand(),
    cwd: ROOT,
  });
  await sleep(5000);
  try {
    const fe = await fetch(`http://localhost:${VERIFY_FRONTEND_PORT}`);
    if (!fe.ok) {
      throw new Error('bad status');
    }
    console.log(`✓ frontend :${VERIFY_FRONTEND_PORT}`);
  } catch {
    console.error(`✗ frontend :${VERIFY_FRONTEND_PORT}`);
    await runCleanup();
    process.exit(1);
  }

  console.log('\n✓ ALL STARTUP CONNECTIONS HEALTHY');
  printStartupMatrix();
  await runCleanup();
}

main().catch(async (err) => {
  console.error('[verify:startup] failed:', err);
  await runCleanup();
  process.exit(1);
});
