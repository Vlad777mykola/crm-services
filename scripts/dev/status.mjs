import { execSync } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { OUTBOX, SERVICES } from './bundles.mjs';
import { readTrackedPids } from '../process/spawn.mjs';
import { DEV_GATEWAY_PORT, DEV_FRONTEND_PORT } from './port-registry.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function portOwner(port) {
  try {
    if (process.platform === 'win32') {
      const out = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
      const line = out.split('\n').find((l) => l.includes('LISTENING'));
      if (!line) return null;
      const pid = Number(line.trim().split(/\s+/).pop());
      return pid > 0 ? pid : null;
    }
    const out = execSync(`lsof -ti :${port}`, { encoding: 'utf8' }).trim();
    return out ? Number(out.split('\n')[0]) : null;
  } catch {
    return null;
  }
}

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '127.0.0.1');
  });
}

/**
 * A port can be closed (service not started), open-but-unready (started, but a
 * dependency like RabbitMQ never connected), or fully ready. Traefik answers
 * `502 Bad Gateway` for the first two cases without saying which, so probe the
 * health endpoints directly and report the distinction.
 */
async function probeHealth(port) {
  async function get(pathname) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}${pathname}`, {
        signal: AbortSignal.timeout(1500),
      });
      return res.status;
    } catch {
      return null;
    }
  }

  const live = await get('/health/live');
  if (live === null) return { state: 'unreachable' };
  if (live !== 200) return { state: 'unhealthy', detail: `/health/live -> ${live}` };

  const ready = await get('/health/ready');
  if (ready === 200) return { state: 'ready' };
  return { state: 'not-ready', detail: `/health/ready -> ${ready ?? 'no response'}` };
}

const STATE_LABEL = {
  ready: 'ready',
  'not-ready': 'NOT READY (dependency down - check RabbitMQ/Postgres)',
  unhealthy: 'UNHEALTHY',
  unreachable: 'no HTTP response',
};

async function main() {
  console.log('\nDocker (dev stack)');
  try {
    execSync('docker compose -f docker/dev/compose.infra.yml -f docker/dev/compose.gateway.yml ps', {
      cwd: ROOT,
      stdio: 'inherit',
    });
  } catch {
    console.log('  (dev compose not running)');
  }

  console.log('\nTracked dev processes');
  const tracked = readTrackedPids();
  if (tracked.length === 0) {
    console.log('  (none)');
  } else {
    for (const e of tracked) {
      console.log(`  ${e.name} pid ${e.rootPid}`);
    }
  }

  console.log('\nDev ports');
  for (const [, svc] of Object.entries(SERVICES)) {
    const pid = portOwner(svc.port);
    if (!pid) {
      console.log(`  ${svc.label} :${svc.port} DOWN (nothing listening - gateway will answer 502)`);
      continue;
    }
    const health = await probeHealth(svc.port);
    const detail = health.detail ? ` - ${health.detail}` : '';
    console.log(`  ${svc.label} :${svc.port} pid ${pid} ${STATE_LABEL[health.state]}${detail}`);
  }
  for (const [id, ob] of Object.entries(OUTBOX)) {
    const pid = portOwner(ob.healthPort);
    console.log(`  outbox-${id} :${ob.healthPort} ${pid ? `pid ${pid}` : 'free'}`);
  }
  console.log(`  gateway :${DEV_GATEWAY_PORT}`);
  console.log(`  frontend :${DEV_FRONTEND_PORT}`);
}

main();
