/** Defaults matching docker/dev/compose.infra.yml and env/dev/common.env */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ENV_FILE = path.join(ROOT, 'env/dev/common.env');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    out[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  return out;
}

export const LOCAL_DEV_ENV = {
  DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/crm',
  RABBITMQ_URL: 'amqp://crm:crm_local_only@localhost:5672',
  JWT_ACCESS_SECRET: 'dev-access-secret-change-me',
  ...loadEnvFile(ENV_FILE),
};

/** @param {Record<string, string | number>} extra */
export function mergeLocalEnv(extra = {}) {
  const vars = { ...LOCAL_DEV_ENV };
  for (const [key, value] of Object.entries(extra)) {
    vars[key] = String(value);
  }
  return vars;
}

/** @param {Record<string, string | number>} extra */
export function crossEnvLocal(extra = {}) {
  const vars = { ...LOCAL_DEV_ENV, ...extra };
  const parts = Object.entries(vars).map(([key, value]) => `${key}=${value}`);
  return `cross-env ${parts.join(' ')}`;
}
