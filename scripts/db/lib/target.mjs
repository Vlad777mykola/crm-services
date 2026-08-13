/**
 * Map DATABASE_URL host ports to Docker compose targets for pg_dump/pg_restore.
 */
import { URL } from 'node:url';

import {
  SMOKE_POSTGRES_PORT,
  TEST_POSTGRES_PORT,
  VERIFY_POSTGRES_PORT,
} from '../../dev/port-registry.mjs';

export const DEV_POSTGRES_PORT = 5432;

const TARGETS = {
  [DEV_POSTGRES_PORT]: {
    label: 'dev',
    project: null,
    composeFiles: ['docker/dev/compose.infra.yml'],
    service: 'postgres',
    database: 'crm',
    user: 'postgres',
    password: 'postgres',
    allowDump: true,
    allowRestore: true,
  },
  [TEST_POSTGRES_PORT]: {
    label: 'test',
    project: 'crm-test',
    composeFiles: ['docker/test/compose.yml'],
    service: 'postgres',
    database: 'crm_test',
    user: 'postgres',
    password: 'postgres',
    allowDump: true,
    allowRestore: true,
  },
  [SMOKE_POSTGRES_PORT]: {
    label: 'smoke',
    project: 'crm-smoke',
    composeFiles: ['docker/smoke/compose.yml'],
    service: 'postgres',
    database: 'crm_smoke',
    user: 'postgres',
    password: 'postgres',
    allowDump: true,
    allowRestore: true,
  },
  [VERIFY_POSTGRES_PORT]: {
    label: 'verify',
    project: 'crm-verify',
    composeFiles: ['docker/verify/compose.yml'],
    service: 'postgres',
    database: 'crm',
    user: 'postgres',
    password: 'postgres',
    allowDump: false,
    allowRestore: false,
  },
};

export function parseDatabaseUrl(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }
  const url = new URL(databaseUrl);
  const port = Number(url.port || 5432);
  const target = TARGETS[port];
  if (!target) {
    throw new Error(
      `Unsupported DATABASE_URL port :${port}. Known dev/test/smoke ports: ${Object.keys(TARGETS).join(', ')}`,
    );
  }
  return {
    port,
    host: url.hostname,
    database: url.pathname.replace(/^\//, '') || target.database,
    user: decodeURIComponent(url.username || target.user),
    password: decodeURIComponent(url.password || target.password),
    target,
  };
}

export const BASELINE_DUMP_NAME = 'dev-baseline.dump';

export function assertOperationAllowed(parsed, operation) {
  if (operation === 'dump' && !parsed.target.allowDump) {
    throw new Error(`pg_dump not allowed on ${parsed.target.label} stack (:${parsed.port})`);
  }
  if (operation === 'restore' && !parsed.target.allowRestore) {
    throw new Error(`pg_restore not allowed on ${parsed.target.label} stack (:${parsed.port})`);
  }
  if (parsed.port === DEV_POSTGRES_PORT && operation === 'restore') {
    console.warn(
      `[db] restoring dev DB on :${DEV_POSTGRES_PORT} — persistent volume; use --fresh or db:reset if you need empty tables first`,
    );
  }
}

