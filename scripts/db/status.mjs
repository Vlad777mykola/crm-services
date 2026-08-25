import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseDbCliArgs } from './lib/cli-args.mjs';
import { envForTarget } from './lib/fill-dump.mjs';
import { printOperationBanner, resolveTarget } from './lib/target.mjs';
import { MIGRATABLE_SERVICES } from './services.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = parseDbCliArgs(process.argv.slice(2));
const target = resolveTarget(args.target);

printOperationBanner({ action: 'MIGRATION STATUS', target });

let failed = false;
for (const service of MIGRATABLE_SERVICES) {
  console.log(`\n[db:migration:status] ${service.name}`);
  const result = spawnSync('yarn', ['workspace', service.workspace, 'run', 'db:migration:status'], {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, ...envForTarget(target.name) },
  });
  if (result.status !== 0) failed = true;
}

process.exitCode = failed ? 1 : 0;
