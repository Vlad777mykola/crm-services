import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseDbCliArgs } from './lib/cli-args.mjs';
import { envForTarget } from './lib/fill-dump.mjs';
import { printOperationBanner, resolveTarget } from './lib/target.mjs';
import { MIGRATABLE_SERVICES } from './services.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export function runServiceMigration(service, target) {
  const startedAt = Date.now();
  const result = spawnSync('yarn', ['workspace', service.workspace, 'run', 'db:migrate'], {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, ...envForTarget(target.name) },
  });

  return {
    service,
    ok: result.status === 0,
    status: result.status,
    durationMs: Date.now() - startedAt,
  };
}

export function printMigrationSummary(results) {
  console.log('\n[db:migrate] summary');
  for (const result of results) {
    const marker = result.ok ? 'ok' : 'failed';
    console.log(`- ${result.service.name}: ${marker} (${result.durationMs}ms)`);
  }
}

export function runAllMigrations(target) {
  const results = [];
  for (const service of MIGRATABLE_SERVICES) {
    console.log(`\n[db:migrate] ${service.name}`);
    const result = runServiceMigration(service, target);
    results.push(result);
    if (!result.ok) {
      printMigrationSummary(results);
      process.exitCode = result.status ?? 1;
      return;
    }
  }
  printMigrationSummary(results);
}

const args = parseDbCliArgs(process.argv.slice(2));
const target = resolveTarget(args.target);

printOperationBanner({ action: 'MIGRATE', target });
runAllMigrations(target);
