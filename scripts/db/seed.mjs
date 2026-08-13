/**
 * Isolated seed profiles — explicit only; never the default dev path.
 *
 * Profiles:
 *   companies  — 2 published companies (companies_schema)
 *   full       — full dev dataset + login accounts (Passw0rd!123)
 *   test       — deterministic test fixtures (:15432 / seed:test)
 */
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseDatabaseUrl } from './lib/target.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const PROFILE_SCRIPTS = {
  companies: 'seed:companies',
  'companies:reset': 'seed:companies:reset',
  full: 'seed',
  'full:reset': 'seed:reset',
  test: 'seed:test',
};

function printHelp() {
  console.log(`
[db:seed] isolated seed profiles (never runs automatically except via explicit flags)

Profiles:
  yarn db:seed:companies     insert 2 published companies
  yarn db:seed:companies:reset truncate companies + insert
  yarn db:seed:full          full microservice dataset + test logins
  yarn db:seed:full:reset      truncate seeded tables + full seed
  yarn db:seed:test            test fixtures (integration/E2E)

Uses DATABASE_URL from env (default dev :5432; test scripts set :15432).

Prefer dump/restore for everyday dev reset:
  yarn db:dump               snapshot current DB → db/dumps/dev-baseline.dump
  yarn db:restore              restore from dev-baseline.dump
  yarn dev dashboard --fresh   restores baseline if dump exists, else seeds
`);
}

const profile = process.argv[2];

if (!profile || profile === 'help' || profile === '--help') {
  printHelp();
  process.exit(profile ? 0 : 1);
}

const scriptKey = profile;
const yarnScript = PROFILE_SCRIPTS[scriptKey];

if (!yarnScript) {
  console.error(`[db:seed] unknown profile "${profile}"`);
  printHelp();
  process.exit(1);
}

const parsed = parseDatabaseUrl();
console.log(`[db:seed] profile=${profile} target=${parsed.target.label} :${parsed.port}`);

execSync(`yarn workspace @crm/fill-dump-db run ${yarnScript}`, {
  cwd: ROOT,
  stdio: 'inherit',
  env: process.env,
});
