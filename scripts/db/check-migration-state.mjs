import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { MIGRATABLE_SERVICES } from './services.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function assertServiceMigrationState(service) {
  const migrationDir = path.join(ROOT, service.path, 'src/db/migrations');
  assert(fs.existsSync(migrationDir), `${service.name} is missing src/db/migrations`);
  assert(
    fs.readdirSync(migrationDir).some((entry) => entry.endsWith('.ts')),
    `${service.name} has no TypeScript migrations`,
  );
  for (const entry of fs.readdirSync(migrationDir).filter((file) => file.endsWith('.ts'))) {
    assert(
      /^\d{13}-[A-Za-z0-9-]+\.ts$/.test(entry),
      `${service.name} migration ${entry} must start with a 13-digit TypeORM timestamp`,
    );
  }

  const dataSource = read(`${service.path}/src/db/data-source.ts`);
  assert(
    dataSource.includes(`migrationsTableName: '${service.migrationsTable}'`),
    `${service.name} data-source.ts must use ${service.migrationsTable}`,
  );
  assert(
    dataSource.includes(`schema: '${service.schema}'`),
    `${service.name} data-source.ts must set schema ${service.schema}`,
  );
}

function assertUniqueMigrationTables() {
  const seen = new Set();
  for (const service of MIGRATABLE_SERVICES) {
    assert(!seen.has(service.migrationsTable), `duplicate migrationsTableName: ${service.migrationsTable}`);
    seen.add(service.migrationsTable);
  }
}

function assertMigratedSchemasRemovedFromBootstrap() {
  const bootstrap = read('scripts/fill_dump_db/src/ensure-schemas.ts');
  for (const service of MIGRATABLE_SERVICES) {
    assert(
      !bootstrap.includes(`CREATE SCHEMA IF NOT EXISTS ${service.schema}`),
      `${service.schema} still has root bootstrap DDL`,
    );
  }
}

function main() {
  assertUniqueMigrationTables();
  for (const service of MIGRATABLE_SERVICES) assertServiceMigrationState(service);
  assertMigratedSchemasRemovedFromBootstrap();
  console.log(`[verify:migrations] ${MIGRATABLE_SERVICES.length} migrated service(s) passed static checks`);
}

try {
  main();
} catch (err) {
  console.error('[verify:migrations] failed:', err);
  process.exitCode = 1;
}
