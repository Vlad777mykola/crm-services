/**
 * Root yarn install for Yarn workspaces — replaces per-service yarn install.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

console.log('[install-services] yarn workspaces — installing all packages from repo root');
const result = spawnSync('yarn', ['install'], { cwd: ROOT, stdio: 'inherit', shell: true });

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log('[install-services] done (frontend, services/*, scripts/fill_dump_db)');
