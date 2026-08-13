/**
 * Run fill_dump_db with target DATABASE_URL.
 */
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveTarget } from './target.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

/**
 * @param {string} targetName
 * @param {string} yarnScript
 * @param {{ stdio?: 'inherit' | 'pipe' }} [opts]
 */
export function runFillDumpDb(targetName, yarnScript, opts = {}) {
  const target = resolveTarget(targetName);
  execSync(`yarn workspace @crm/fill-dump-db run ${yarnScript}`, {
    cwd: ROOT,
    stdio: opts.stdio ?? 'inherit',
    env: { ...process.env, DATABASE_URL: target.hostDatabaseUrl },
  });
}

/**
 * @param {string} targetName
 */
export function envForTarget(targetName) {
  const target = resolveTarget(targetName);
  return { DATABASE_URL: target.hostDatabaseUrl, RABBITMQ_URL: target.hostRabbitmqUrl };
}
