/**
 * Target-aware application idle detection and stopping.
 */
import { execSync } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { OUTBOX, SERVICES } from '../../dev/bundles.mjs';
import { SMOKE_PROJECT, verifyAppPort } from '../../dev/port-registry.mjs';
import { clearTrackedPids, readTrackedPids } from '../../process/spawn.mjs';
import { terminateTree } from '../../process/terminate-tree.mjs';
import { composeFileArgs } from './target.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

const DEV_APP_PORTS = [
  ...Object.values(SERVICES).map((s) => s.port),
  ...Object.values(OUTBOX).map((o) => o.healthPort),
  4100,
  4200,
  5173,
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function portInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(true));
    server.once('listening', () => server.close(() => resolve(false)));
    server.listen(port, '127.0.0.1');
  });
}

/**
 * @param {number[]} ports
 */
async function anyPortInUse(ports) {
  for (const port of ports) {
    if (await portInUse(port)) return port;
  }
  return null;
}

/**
 * @param {typeof import('./target.mjs').TARGET_BY_NAME.dev} target
 */
function idleGuidance(target) {
  switch (target.name) {
    case 'dev':
      return 'Run: yarn dev stop';
    case 'verify':
      return 'Stop verify processes or run verify teardown';
    case 'test':
      return 'Stop test stack services (integration/e2e teardown)';
    case 'smoke':
      return 'Run: docker compose -p crm-smoke stop app services';
    default:
      return 'Stop application processes for this target';
  }
}

/**
 * @param {typeof import('./target.mjs').TARGET_BY_NAME.dev} target
 */
export async function getTargetAppPorts(target) {
  switch (target.name) {
    case 'dev':
      return DEV_APP_PORTS;
    case 'verify':
      return [
        ...Object.values(SERVICES).map((s) => verifyAppPort(s.port)),
        ...Object.values(OUTBOX).map((o) => verifyAppPort(o.healthPort)),
        verifyAppPort(4100),
        verifyAppPort(4200),
        15173,
      ];
    case 'test':
      return [
        ...Object.values(SERVICES).map((s) => s.port + 20000),
        ...Object.values(OUTBOX).map((o) => o.healthPort + 20000),
        25173,
        18080,
      ];
    case 'smoke':
      return [38080];
    default:
      return [];
  }
}

/**
 * @param {typeof import('./target.mjs').TARGET_BY_NAME.dev} target
 */
export async function ensureTargetIdle(target) {
  const busyPort = await anyPortInUse(await getTargetAppPorts(target));
  if (busyPort) {
    throw new Error(
      `Target "${target.name}" is in use (port :${busyPort} busy). ${idleGuidance(target)}`,
    );
  }

  const tracked = readTrackedPids();
  if (tracked.length > 0 && (target.name === 'dev' || target.name === 'verify')) {
    throw new Error(
      `Target "${target.name}" has ${tracked.length} tracked process(es). ${idleGuidance(target)}`,
    );
  }
}

/**
 * @param {typeof import('./target.mjs').TARGET_BY_NAME.dev} target
 */
export async function stopTargetApps(target) {
  switch (target.name) {
    case 'dev':
    case 'verify':
      for (const entry of readTrackedPids()) {
        terminateTree(entry.rootPid);
      }
      clearTrackedPids();
      for (const port of await getTargetAppPorts(target)) {
        const deadline = Date.now() + 15000;
        while (Date.now() < deadline && (await portInUse(port))) {
          await sleep(300);
        }
      }
      break;
    case 'test':
      try {
        execSync('node scripts/test/stack.mjs stop-services', {
          cwd: ROOT,
          stdio: 'inherit',
        });
      } catch {
        // stack helper may not exist yet — fall through to port wait
      }
      break;
    case 'smoke':
      const files = composeFileArgs(ROOT, target);
      const composeArgs = files.flatMap((f) => ['-f', f]);
      try {
        execSync(
          `docker compose -p ${SMOKE_PROJECT} ${composeArgs.join(' ')} stop companies-service gateway`,
          { cwd: ROOT, stdio: 'inherit', shell: true },
        );
      } catch {
        // ignore if not running
      }
      break;
    default:
      break;
  }
}
