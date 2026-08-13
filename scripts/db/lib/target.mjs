/**
 * Central target registry — host/docker Postgres URLs, admin URLs, RabbitMQ vhost metadata.
 */
import path from 'node:path';

import {
  SMOKE_POSTGRES_PORT,
  SMOKE_PROJECT,
  SMOKE_RABBITMQ_PORT,
  TEST_POSTGRES_PORT,
  TEST_PROJECT,
  TEST_RABBITMQ_MGMT_PORT,
  TEST_RABBITMQ_PORT,
  VERIFY_POSTGRES_PORT,
  VERIFY_PROJECT,
  VERIFY_RABBITMQ_MGMT_PORT,
  VERIFY_RABBITMQ_PORT,
} from '../../dev/port-registry.mjs';

export const DEV_POSTGRES_PORT = 5432;
export const DEV_RABBITMQ_PORT = 5672;
export const DEV_RABBITMQ_MGMT_PORT = 15672;
export const SMOKE_RABBITMQ_MGMT_PORT = 35473;

const RABBITMQ_USER = 'crm';
const RABBITMQ_PASS = 'crm_local_only';
const PG_USER = 'postgres';
const PG_PASS = 'postgres';
const POSTGRES_MAJOR = 16;

function pgUrl(host, port, database) {
  return `postgres://${PG_USER}:${PG_PASS}@${host}:${port}/${database}`;
}

function amqpUrl(host, port, vhost) {
  const v = vhost.startsWith('/') ? vhost.slice(1) : vhost;
  return `amqp://${RABBITMQ_USER}:${RABBITMQ_PASS}@${host}:${port}/${v}`;
}

/** @typedef {'dev' | 'test' | 'verify' | 'smoke'} TargetName */

const TARGET_BY_NAME = {
  dev: {
    name: 'dev',
    project: null,
    composeFiles: ['docker/dev/compose.infra.yml'],
    appComposeFiles: [
      'docker/dev/compose.infra.yml',
      'docker/dev/compose.gateway.yml',
      'docker/dev/compose.services.yml',
    ],
    appRuntime: 'host',
    service: 'postgres',
    rabbitmqService: 'rabbitmq',
    database: 'crm',
    user: PG_USER,
    password: PG_PASS,
    postgresMajor: POSTGRES_MAJOR,
    hostPort: DEV_POSTGRES_PORT,
    rabbitmqHostPort: DEV_RABBITMQ_PORT,
    rabbitmqMgmtPort: DEV_RABBITMQ_MGMT_PORT,
    rabbitmqVhost: 'crm-dev',
    rabbitmqUser: RABBITMQ_USER,
    rabbitmqPassword: RABBITMQ_PASS,
    hostDatabaseUrl: pgUrl('localhost', DEV_POSTGRES_PORT, 'crm'),
    dockerDatabaseUrl: pgUrl('postgres', 5432, 'crm'),
    hostAdminUrl: pgUrl('localhost', DEV_POSTGRES_PORT, 'postgres'),
    dockerAdminUrl: pgUrl('postgres', 5432, 'postgres'),
    hostRabbitmqUrl: amqpUrl('localhost', DEV_RABBITMQ_PORT, 'crm-dev'),
  },
  test: {
    name: 'test',
    project: TEST_PROJECT,
    composeFiles: ['docker/test/compose.yml'],
    appComposeFiles: ['docker/test/compose.yml'],
    appRuntime: 'host',
    service: 'postgres',
    rabbitmqService: 'rabbitmq',
    database: 'crm_test',
    user: PG_USER,
    password: PG_PASS,
    postgresMajor: POSTGRES_MAJOR,
    hostPort: TEST_POSTGRES_PORT,
    rabbitmqHostPort: TEST_RABBITMQ_PORT,
    rabbitmqMgmtPort: TEST_RABBITMQ_MGMT_PORT,
    rabbitmqVhost: 'crm-test',
    rabbitmqUser: RABBITMQ_USER,
    rabbitmqPassword: RABBITMQ_PASS,
    hostDatabaseUrl: pgUrl('localhost', TEST_POSTGRES_PORT, 'crm_test'),
    dockerDatabaseUrl: pgUrl('postgres', 5432, 'crm_test'),
    hostAdminUrl: pgUrl('localhost', TEST_POSTGRES_PORT, 'postgres'),
    dockerAdminUrl: pgUrl('postgres', 5432, 'postgres'),
    hostRabbitmqUrl: amqpUrl('localhost', TEST_RABBITMQ_PORT, 'crm-test'),
  },
  verify: {
    name: 'verify',
    project: VERIFY_PROJECT,
    composeFiles: ['docker/verify/compose.yml'],
    appComposeFiles: ['docker/verify/compose.yml'],
    appRuntime: 'host',
    service: 'postgres',
    rabbitmqService: 'rabbitmq',
    database: 'crm',
    user: PG_USER,
    password: PG_PASS,
    postgresMajor: POSTGRES_MAJOR,
    hostPort: VERIFY_POSTGRES_PORT,
    rabbitmqHostPort: VERIFY_RABBITMQ_PORT,
    rabbitmqMgmtPort: VERIFY_RABBITMQ_MGMT_PORT,
    rabbitmqVhost: 'crm-verify',
    rabbitmqUser: RABBITMQ_USER,
    rabbitmqPassword: RABBITMQ_PASS,
    hostDatabaseUrl: pgUrl('localhost', VERIFY_POSTGRES_PORT, 'crm'),
    dockerDatabaseUrl: pgUrl('postgres', 5432, 'crm'),
    hostAdminUrl: pgUrl('localhost', VERIFY_POSTGRES_PORT, 'postgres'),
    dockerAdminUrl: pgUrl('postgres', 5432, 'postgres'),
    hostRabbitmqUrl: amqpUrl('localhost', VERIFY_RABBITMQ_PORT, 'crm-verify'),
  },
  smoke: {
    name: 'smoke',
    project: SMOKE_PROJECT,
    composeFiles: ['docker/smoke/compose.yml'],
    appComposeFiles: ['docker/smoke/compose.yml'],
    appRuntime: 'compose',
    service: 'postgres',
    rabbitmqService: 'rabbitmq',
    database: 'crm_smoke',
    user: PG_USER,
    password: PG_PASS,
    postgresMajor: POSTGRES_MAJOR,
    hostPort: SMOKE_POSTGRES_PORT,
    rabbitmqHostPort: SMOKE_RABBITMQ_PORT,
    rabbitmqMgmtPort: SMOKE_RABBITMQ_MGMT_PORT,
    rabbitmqVhost: 'crm-smoke',
    rabbitmqUser: RABBITMQ_USER,
    rabbitmqPassword: RABBITMQ_PASS,
    hostDatabaseUrl: pgUrl('localhost', SMOKE_POSTGRES_PORT, 'crm_smoke'),
    dockerDatabaseUrl: pgUrl('postgres', 5432, 'crm_smoke'),
    hostAdminUrl: pgUrl('localhost', SMOKE_POSTGRES_PORT, 'postgres'),
    dockerAdminUrl: pgUrl('postgres', 5432, 'postgres'),
    hostRabbitmqUrl: amqpUrl('localhost', SMOKE_RABBITMQ_PORT, 'crm-smoke'),
  },
};

const SAFE_TARGETS = new Set(Object.keys(TARGET_BY_NAME));

/**
 * @param {string} [targetName]
 * @returns {typeof TARGET_BY_NAME.dev}
 */
export function resolveTarget(targetName = 'dev') {
  const name = String(targetName).toLowerCase();
  const target = TARGET_BY_NAME[name];
  if (!target) {
    throw new Error(
      `Unknown target "${targetName}". Use: ${[...SAFE_TARGETS].join(', ')}`,
    );
  }
  return target;
}

/**
 * @param {typeof TARGET_BY_NAME.dev} target
 * @param {string} operation
 */
export function assertSafeDatabaseTarget(target, operation) {
  if (!SAFE_TARGETS.has(target.name)) {
    throw new Error(`Destructive operation "${operation}" blocked for target "${target.name}"`);
  }
}

/**
 * @param {{ action: string; target: typeof TARGET_BY_NAME.dev; source?: string }} opts
 */
export function printOperationBanner({ action, target, source }) {
  console.log('');
  console.log('Database operation');
  console.log(`  Action:   ${action}`);
  console.log(`  Target:   ${target.name}`);
  console.log(`  Host:     localhost`);
  console.log(`  Port:     ${target.hostPort}`);
  console.log(`  Database: ${target.database}`);
  if (source) {
    console.log(`  Source:   ${source}`);
  }
  console.log('');
}

/**
 * @param {string} root
 * @param {typeof TARGET_BY_NAME.dev} target
 */
export function composeFileArgs(root, target) {
  return target.composeFiles.map((f) => path.join(root, f));
}

export const BASELINE_LOCAL_DUMP = 'team-baseline.dump';
