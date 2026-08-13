import { execSync } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { OUTBOX, SERVICES } from './bundles.mjs';
import { clearTrackedPids, readTrackedPids } from '../process/spawn.mjs';
import { terminateTree } from '../process/terminate-tree.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DEV_PORTS = [
  ...Object.values(SERVICES).map((s) => s.port),
  ...Object.values(OUTBOX).map((o) => o.healthPort),
  4100,
  4200,
  5173,
];

function portOwner(port) {
  try {
    if (process.platform === 'win32') {
      const out = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
      const line = out.split('\n').find((l) => l.includes('LISTENING'));
      if (!line) return null;
      return Number(line.trim().split(/\s+/).pop());
    }
    const out = execSync(`lsof -ti :${port}`, { encoding: 'utf8' }).trim();
    return out ? Number(out.split('\n')[0]) : null;
  } catch {
    return null;
  }
}

function killPort(port) {
  const pid = portOwner(port);
  if (pid) {
    console.log(`[dev stop] killing port :${port} pid ${pid}`);
    terminateTree(pid);
  }
}

async function waitPortFree(port, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const free = await new Promise((resolve) => {
      const server = net.createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => server.close(() => resolve(true)));
      server.listen(port, '127.0.0.1');
    });
    if (free) return true;
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

async function main() {
  const args = process.argv.slice(2);
  const forcePorts = args.includes('--force-ports');
  const stopInfra = args.includes('--infra');

  const tracked = readTrackedPids();
  if (tracked.length === 0) {
    console.log('[dev stop] no tracked dev processes');
  } else {
    console.log(`[dev stop] stopping ${tracked.length} tracked process tree(s)…`);
    for (const entry of tracked) {
      terminateTree(entry.rootPid);
    }
    clearTrackedPids();
  }

  if (forcePorts) {
    console.warn('[dev stop] --force-ports: killing listeners on known dev ports');
    for (const port of DEV_PORTS) {
      killPort(port);
    }
  }

  if (stopInfra) {
    console.log('[dev stop] docker compose down (dev infra)…');
    execSync(
      'docker compose -f docker/dev/compose.infra.yml -f docker/dev/compose.gateway.yml --profile events down',
      { cwd: ROOT, stdio: 'inherit' },
    );
  }

  console.log('[dev stop] done');
}

export async function stopTrackedDevProcesses() {
  for (const entry of readTrackedPids()) {
    terminateTree(entry.rootPid);
  }
  clearTrackedPids();
}

export async function waitDevPortsFree(keys, resolveKey) {
  const ports = new Set();
  for (const key of keys) {
    const cmd = resolveKey(key);
    const svc = SERVICES[key];
    const ob = key.startsWith('outbox:') ? OUTBOX[key.slice(7)] : null;
    if (svc) ports.add(svc.port);
    if (ob) ports.add(ob.healthPort);
    if (key === 'frontend') ports.add(5173);
  }
  for (const port of ports) {
    const ok = await waitPortFree(port);
    if (!ok) {
      throw new Error(`Port :${port} still in use after stop`);
    }
  }
}

main().catch((err) => {
  console.error('[dev stop] failed:', err);
  process.exit(1);
});
