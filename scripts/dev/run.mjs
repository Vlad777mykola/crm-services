import { execSync } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import concurrently from 'concurrently';

import { BUNDLES, OUTBOX, PREFIX_COLORS, SERVICES } from './bundles.mjs';
import { features, listFeatures, resolveFeature } from './features.mjs';
import { ensureDevInfra } from './ensure-infra.mjs';
import { crossEnvLocal, mergeLocalEnv } from './local-dev-env.mjs';
import { DEV_FRONTEND_PORT, DEV_GATEWAY_PORT } from './port-registry.mjs';
import { appendTrackedPid, clearTrackedPids, readTrackedPids, spawnTracked } from '../process/spawn.mjs';
import { registerCleanup, registerSignalHandlers } from '../process/signals.mjs';
import { terminateTree } from '../process/terminate-tree.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const READINESS_TIMEOUT_MS = 120000;
const POLL_MS = 500;
const DEFAULT_FEATURE = 'companies';

/** Spawn spec for a feature key (env injected in process — no cross-env on Windows). */
function resolveSpawnSpec(key) {
  if (key === 'frontend') {
    return {
      name: 'frontend',
      command: 'yarn workspace @crm/frontend dev',
      cwd: ROOT,
      port: DEV_FRONTEND_PORT,
      env: { VITE_API_URL: `http://localhost:${DEV_GATEWAY_PORT}` },
    };
  }

  if (key.startsWith('outbox:')) {
    const id = key.slice('outbox:'.length);
    const outbox = OUTBOX[id];
    if (!outbox) throw new Error(`Unknown outbox: ${id}`);
    return {
      name: `outbox-${id}`,
      command: 'yarn dev',
      cwd: path.join(ROOT, 'services/outbox-publisher'),
      port: outbox.healthPort,
      env: mergeLocalEnv({ OUTBOX_SCHEMA: outbox.schema, HEALTH_PORT: outbox.healthPort }),
    };
  }

  const service = SERVICES[key];
  if (!service) throw new Error(`Unknown service: ${key}`);
  const port = service.port;
  const envExtra = key === 'notifications' ? { HEALTH_PORT: port } : { PORT: port };
  return {
    name: key,
    command: 'yarn dev',
    cwd: path.join(ROOT, service.dir),
    port,
    env: mergeLocalEnv(envExtra),
  };
}

/** Legacy concurrently helper (cross-env string commands). */
function resolveKey(key) {
  const spec = resolveSpawnSpec(key);
  if (key === 'frontend') {
    return {
      name: spec.name,
      command: `cross-env VITE_API_URL=http://localhost:${DEV_GATEWAY_PORT} yarn workspace @crm/frontend dev`,
      cwd: spec.cwd,
      port: spec.port,
    };
  }
  if (key.startsWith('outbox:')) {
    const id = key.slice('outbox:'.length);
    const outbox = OUTBOX[id];
    return {
      name: `outbox-${id}`,
      command: `${crossEnvLocal({ OUTBOX_SCHEMA: outbox.schema, HEALTH_PORT: outbox.healthPort })} yarn dev`,
      cwd: path.join(ROOT, 'services/outbox-publisher'),
      port: outbox.healthPort,
    };
  }
  const service = SERVICES[key];
  const port = service.port;
  const envExtra = key === 'notifications' ? { HEALTH_PORT: port } : { PORT: port };
  return {
    name: key,
    command: `${crossEnvLocal(envExtra)} yarn dev`,
    cwd: path.join(ROOT, service.dir),
    port,
  };
}

function commandsForKeys(keys) {
  return keys.map((key) => {
    const r = resolveKey(key);
    return { name: r.name, command: r.command, cwd: r.cwd };
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function portInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(true));
    server.once('listening', () => server.close(() => resolve(false)));
    server.listen(port, '127.0.0.1');
  });
}

async function waitReady(port, label) {
  const deadline = Date.now() + READINESS_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://localhost:${port}/health/ready`);
      if (res.ok) {
        console.log(`✓ ${label} :${port}`);
        return true;
      }
    } catch {
      // retry
    }
    await sleep(POLL_MS);
  }
  console.error(`✗ ${label} :${port} — readiness timeout`);
  return false;
}

async function isFrontendServing(port) {
  try {
    const res = await fetch(`http://localhost:${port}`);
    return res.ok;
  } catch {
    return false;
  }
}

async function isServiceReady(port) {
  try {
    const res = await fetch(`http://localhost:${port}/health/ready`);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Skip spawn when port is already serving a healthy process (e.g. frontend from another feature).
 * @param {string[]} keys
 */
async function resolveSpawnPlan(keys) {
  const toSpawn = [];
  for (const key of keys) {
    const { port, name } = resolveSpawnSpec(key);
    if (!(await portInUse(port))) {
      toSpawn.push(key);
      continue;
    }
    if (key === 'frontend' && (await isFrontendServing(port))) {
      console.log(`[dev] reusing existing frontend on :${port}`);
      continue;
    }
    if (key !== 'frontend' && (await isServiceReady(port))) {
      console.log(`[dev] reusing existing ${name} on :${port}`);
      continue;
    }
    console.error(`✗ Port ${port} already in use (${name}) but not responding`);
    console.error('  Run: yarn dev stop');
    process.exit(1);
  }
  return toSpawn;
}

function printList() {
  console.log(`Features (yarn dev <name>) — default: ${DEFAULT_FEATURE} (public list + frontend)`);
  for (const name of listFeatures()) {
    const { keys, schemaIds } = resolveFeature(name);
    console.log(
      `  ${name.padEnd(12)} ${keys.join(', ')}${schemaIds.length ? ` | schemas: ${schemaIds.join(',')}` : ''}`,
    );
  }
  console.log('\n  yarn dev check | status | stop [--infra] [--force-ports]');
  console.log('  yarn dev <feature> [--fresh] [--baseline] [--no-infra] [--no-frontend]');
}

async function stopDevApps(keys) {
  for (const entry of readTrackedPids()) {
    terminateTree(entry.rootPid);
  }
  clearTrackedPids();
  for (const key of keys) {
    const { port } = resolveSpawnSpec(key);
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline && (await portInUse(port))) {
      await sleep(300);
    }
  }
}

async function runFeature(featureName, options) {
  registerSignalHandlers();
  registerCleanup(async () => {
    for (const entry of readTrackedPids()) {
      terminateTree(entry.rootPid);
    }
    clearTrackedPids();
    console.log('[dev] stopped tracked processes');
  });

  let { keys, schemaIds, seedProfile } = resolveFeature(featureName);
  if (options.noFrontend) {
    keys = keys.filter((k) => k !== 'frontend');
  }

  execSync('node scripts/dev/check.mjs', { cwd: ROOT, stdio: 'inherit' });

  if (!options.noInfra) {
    ensureDevInfra();
  }

  if (options.baseline) {
    await stopDevApps(keys);
    console.log('[dev] --baseline: restore team baseline');
    execSync('node scripts/db/baseline-restore.mjs --target dev', { cwd: ROOT, stdio: 'inherit' });
  } else if (options.fresh) {
    await stopDevApps(keys);
    console.log('[dev] --fresh: migrate → reset → seed');
    execSync('node scripts/db/migrate.mjs --target dev', { cwd: ROOT, stdio: 'inherit' });
    execSync('node scripts/db/reset.mjs --target dev', { cwd: ROOT, stdio: 'inherit' });
    execSync(`node scripts/db/seed.mjs ${seedProfile} --target dev`, { cwd: ROOT, stdio: 'inherit' });
  } else if (schemaIds.length > 0) {
    execSync('node scripts/db/migrate.mjs --target dev', { cwd: ROOT, stdio: 'inherit' });
  }

  const keysToSpawn = await resolveSpawnPlan(keys);

  console.log(`\n[dev] feature "${featureName}"\n`);

  for (const key of keysToSpawn) {
    const spec = resolveSpawnSpec(key);
    spawnTracked({
      name: spec.name,
      command: spec.command,
      cwd: spec.cwd,
      env: spec.env,
      stdio: 'inherit',
    });
  }

  await sleep(3000);
  console.log('\nWaiting for readiness…');
  for (const key of keys) {
    const { port, name } = resolveSpawnSpec(key);
    if (key === 'frontend') {
      await sleep(2000);
      try {
        const res = await fetch(`http://localhost:${port}`);
        if (!res.ok) throw new Error('bad status');
        console.log(`✓ frontend :${port}`);
      } catch {
        console.error(`✗ frontend :${port}`);
        process.exit(1);
      }
      continue;
    }
    if (!(await waitReady(port, name))) {
      process.exit(1);
    }
  }

  console.log(`\nhttp://localhost:${DEV_FRONTEND_PORT}`);
  console.log(`API: http://localhost:${DEV_GATEWAY_PORT}`);
  console.log(`Public companies: http://localhost:${DEV_GATEWAY_PORT}/companies/public\n`);

  await new Promise(() => {});
}

async function main() {
  const args = process.argv.slice(2);
  const fresh = args.includes('--fresh');
  const baseline = args.includes('--baseline');
  const noInfra = args.includes('--no-infra');
  const noFrontend = args.includes('--no-frontend');
  const positional = args.filter((a) => !a.startsWith('--'));

  if (positional.length === 0) {
    await runFeature(DEFAULT_FEATURE, { fresh, baseline, noInfra, noFrontend });
    return;
  }

  const cmd = positional[0];

  if (cmd === 'list') {
    printList();
    return;
  }

  if (cmd === 'check') {
    execSync('node scripts/dev/check.mjs', { cwd: ROOT, stdio: 'inherit' });
    return;
  }
  if (cmd === 'status') {
    execSync('node scripts/dev/status.mjs', { cwd: ROOT, stdio: 'inherit' });
    return;
  }
  if (cmd === 'stop') {
    execSync(`node scripts/dev/stop.mjs ${positional.slice(1).join(' ')}`, { cwd: ROOT, stdio: 'inherit' });
    return;
  }

  if (features[cmd]) {
    await runFeature(cmd, { fresh, baseline, noInfra, noFrontend });
    return;
  }

  if (cmd === 'svc') {
    const ids = positional.slice(1);
    const { result } = concurrently(commandsForKeys(ids), {
      prefix: 'name',
      prefixColors: PREFIX_COLORS,
      cwd: ROOT,
    });
    await result;
    return;
  }

  if (cmd === 'outbox') {
    const ids = positional.slice(1);
    const { result } = concurrently(commandsForKeys(ids.map((id) => `outbox:${id}`)), {
      prefix: 'name',
      prefixColors: PREFIX_COLORS,
      cwd: ROOT,
    });
    await result;
    return;
  }

  const bundle = BUNDLES[cmd];
  if (bundle) {
    console.log(`[dev] legacy bundle ${cmd}`);
    const { result } = concurrently(commandsForKeys(bundle.keys), {
      prefix: 'name',
      prefixColors: PREFIX_COLORS,
      cwd: ROOT,
    });
    await result;
    return;
  }

  console.error(`Unknown: ${cmd}. Run: yarn dev list`);
  process.exit(1);
}

main().catch((err) => {
  console.error('[dev] failed:', err);
  process.exit(1);
});
