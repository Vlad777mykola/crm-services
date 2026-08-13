import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

console.log('[db:reset] truncating dev schemas (no seed)…');
execSync('yarn workspace @crm/fill-dump-db run reset-only', {
  cwd: ROOT,
  stdio: 'inherit',
  env: process.env,
});
