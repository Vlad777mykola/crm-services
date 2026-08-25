import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseDbCliArgs } from './lib/cli-args.mjs';
import { envForTarget } from './lib/fill-dump.mjs';
import { printOperationBanner, resolveTarget } from './lib/target.mjs';
import { MIGRATABLE_SERVICES } from './services.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function readFlag(argv, flagName) {
  const equalsValue = argv.find((arg) => arg.startsWith(`${flagName}=`));
  if (equalsValue) return equalsValue.slice(flagName.length + 1);

  const index = argv.indexOf(flagName);
  if (index >= 0) return argv[index + 1];

  return undefined;
}

function assertSafeMigrationName(name) {
  if (!/^[A-Za-z][A-Za-z0-9]*$/.test(name)) {
    throw new Error('[db:migration:generate] --name must be PascalCase or camelCase letters/numbers only');
  }
}

const argv = process.argv.slice(2);
const serviceName = readFlag(argv, '--service');
const migrationName = readFlag(argv, '--name');

if (!serviceName || !migrationName) {
  console.error('[db:migration:generate] usage: yarn db:migration:generate --service users-service --name AddUserPhone --target dev');
  process.exit(1);
}

assertSafeMigrationName(migrationName);

const service = MIGRATABLE_SERVICES.find((candidate) => candidate.name === serviceName);
if (!service) {
  console.error(`[db:migration:generate] unknown migratable service "${serviceName}"`);
  console.error(`[db:migration:generate] known services: ${MIGRATABLE_SERVICES.map((candidate) => candidate.name).join(', ')}`);
  process.exit(1);
}

const args = parseDbCliArgs(argv);
const target = resolveTarget(args.target);
printOperationBanner({ action: `GENERATE ${service.name} ${migrationName}`, target });

const result = spawnSync(
  'yarn',
  ['workspace', service.workspace, 'run', 'db:migration:generate', `src/db/migrations/${migrationName}`],
  {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, ...envForTarget(target.name) },
  },
);

process.exitCode = result.status ?? 1;
