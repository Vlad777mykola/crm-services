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
  for (const [id, svc] of Object.entries(SERVICES)) {
    const pid = portOwner(svc.port);
    console.log(`  ${svc.label} :${svc.port} ${pid ? `pid ${pid}` : 'free'}`);
  }
  for (const [id, ob] of Object.entries(OUTBOX)) {
    const pid = portOwner(ob.healthPort);
    console.log(`  outbox-${id} :${ob.healthPort} ${pid ? `pid ${pid}` : 'free'}`);
  }
  console.log(`  gateway :${DEV_GATEWAY_PORT}`);
  console.log(`  frontend :${DEV_FRONTEND_PORT}`);
}

main();
