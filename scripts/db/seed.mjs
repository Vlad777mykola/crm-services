/**
 * Isolated seed profiles — explicit only.
 */
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseDbCliArgs } from './lib/cli-args.mjs';
import { runDestructiveOperation } from './lib/destructive.mjs';
import { envForTarget, runFillDumpDb } from './lib/fill-dump.mjs';
import { printOperationBanner, resolveTarget } from './lib/target.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const PROFILE_SCRIPTS = {
  companies: 'seed:companies',
  'companies:reset': 'seed:companies:reset',
  full: 'seed',
  'full:reset': 'seed:reset',
  test: 'seed:test',
};

const DESTRUCTIVE_PROFILES = new Set(['companies:reset', 'full:reset']);

function printHelp() {
  console.log(`
[db:seed] isolated seed profiles

  yarn db:seed:companies --target dev
  yarn db:seed:companies:reset --target dev
  yarn db:seed:full --target dev
  yarn db:seed:full:reset --target dev
  yarn db:seed:test --target test
`);
}

const profileArg = process.argv[2];
const cliArgs = parseDbCliArgs(process.argv.slice(3));

if (!profileArg || profileArg === 'help' || profileArg === '--help') {
  printHelp();
  process.exit(profileArg ? 0 : 1);
}

const yarnScript = PROFILE_SCRIPTS[profileArg];
if (!yarnScript) {
  console.error(`[db:seed] unknown profile "${profileArg}"`);
  printHelp();
  process.exit(1);
}

const target = resolveTarget(cliArgs.target);
printOperationBanner({ action: `SEED ${profileArg}`, target });

async function runSeed() {
  execSync(`yarn workspace @crm/fill-dump-db run ${yarnScript}`, {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, ...envForTarget(target.name) },
  });
}

if (DESTRUCTIVE_PROFILES.has(profileArg)) {
  await runDestructiveOperation(
    target.name,
    `SEED_${profileArg}`,
    async () => {
      await runSeed();
    },
    { stopApps: cliArgs.stopApps },
  );
} else {
  await runSeed();
}
