import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseDbCliArgs } from './lib/cli-args.mjs';
import { envForTarget } from './lib/fill-dump.mjs';
import { printOperationBanner, resolveTarget } from './lib/target.mjs';
import { yarnCommand } from './lib/yarn-command.mjs';
import { MIGRATABLE_SERVICES } from './services.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function readServiceArg(argv) {
  const serviceFlag = argv.find((arg) => arg.startsWith('--service='));
  if (serviceFlag) return serviceFlag.slice('--service='.length);

  const serviceIndex = argv.indexOf('--service');
  if (serviceIndex >= 0) return argv[serviceIndex + 1];

  return undefined;
}

const serviceName = readServiceArg(process.argv.slice(2));
if (!serviceName) {
  console.error('[db:migrate:revert] pass --service <service-name>');
  process.exit(1);
}

const service = MIGRATABLE_SERVICES.find((candidate) => candidate.name === serviceName);
if (!service) {
  console.error(`[db:migrate:revert] unknown migratable service "${serviceName}"`);
  console.error(`[db:migrate:revert] known services: ${MIGRATABLE_SERVICES.map((candidate) => candidate.name).join(', ')}`);
  process.exit(1);
}

const args = parseDbCliArgs(process.argv.slice(2));
const target = resolveTarget(args.target);
printOperationBanner({ action: `REVERT ${service.name}`, target });
console.warn('[db:migrate:revert] Reverting migrations is service-scoped and should be reviewed before production use.');

const yarn = yarnCommand(['workspace', service.workspace, 'run', 'db:migrate:revert']);
const result = spawnSync(yarn.command, yarn.args, {
  cwd: ROOT,
  stdio: 'inherit',
  env: { ...process.env, ...envForTarget(target.name) },
});

process.exitCode = result.status ?? 1;
