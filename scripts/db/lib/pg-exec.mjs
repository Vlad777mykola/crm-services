import { spawnSync } from 'node:child_process';
import path from 'node:path';

/**
 * @param {string} root
 * @param {ReturnType<typeof import('./target.mjs').resolveTarget>} target
 * @param {string[]} subcommand
 * @param {Record<string, string>} [containerEnv]
 */
function dockerComposeRun(root, target, subcommand, containerEnv = {}) {
  const args = ['compose', '--profile', 'tools'];
  if (target.project) args.push('-p', target.project);
  for (const file of target.composeFiles) {
    args.push('-f', path.join(root, file));
  }
  args.push('run', '--rm', '--no-deps');
  for (const [key, value] of Object.entries(containerEnv)) {
    args.push('-e', `${key}=${value}`);
  }
  args.push('db-tools', ...subcommand);
  return args;
}

/**
 * @param {string[]} args
 */
function runDocker(args) {
  const result = spawnSync('docker', args, { encoding: 'utf8' });
  if (result.status !== 0) {
    const err = [result.stderr, result.stdout].filter(Boolean).join('\n').trim();
    throw new Error(err || 'docker compose failed');
  }
  return result;
}

/**
 * @param {string} databaseUrl
 */
function parsePgUrl(databaseUrl) {
  const u = new URL(databaseUrl);
  return {
    host: u.hostname,
    port: u.port || '5432',
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ''),
  };
}

/**
 * @param {string} root
 * @param {ReturnType<typeof import('./target.mjs').resolveTarget>} target
 * @param {string} adminUrl
 * @param {string} sql
 */
function psqlAdmin(root, target, adminUrl, sql) {
  const pg = parsePgUrl(adminUrl);
  runDocker(
    dockerComposeRun(root, target, [
      'psql',
      '-h',
      pg.host,
      '-p',
      pg.port,
      '-U',
      pg.user,
      '-d',
      pg.database,
      '-v',
      'ON_ERROR_STOP=1',
      '-c',
      sql,
    ], { PGPASSWORD: pg.password }),
  );
}

/**
 * @param {string} root
 * @param {ReturnType<typeof import('./target.mjs').resolveTarget>} target
 * @param {string} outputPath
 */
export function pgDumpToFile(root, target, outputPath) {
  const pg = parsePgUrl(target.dockerDatabaseUrl);
  const normalized = outputPath.replace(/\\/g, '/');
  const containerOut = normalized.includes('/baseline/')
    ? `/db/baseline/${path.basename(outputPath)}`
    : `/db/backups/${path.basename(outputPath)}`;
  runDocker(
    dockerComposeRun(root, target, [
      'pg_dump',
      '-h',
      pg.host,
      '-p',
      pg.port,
      '-U',
      pg.user,
      '-Fc',
      '--no-owner',
      '--no-acl',
      '-f',
      containerOut,
      pg.database,
    ], { PGPASSWORD: pg.password }),
  );
}

/**
 * @param {string} root
 * @param {ReturnType<typeof import('./target.mjs').resolveTarget>} target
 */
export function terminateConnections(root, target) {
  const db = target.database;
  psqlAdmin(
    root,
    target,
    target.dockerAdminUrl,
    `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${db}' AND pid <> pg_backend_pid();`,
  );
}

/**
 * @param {string} root
 * @param {ReturnType<typeof import('./target.mjs').resolveTarget>} target
 */
export function dropAndRecreateDatabase(root, target) {
  const db = target.database;
  terminateConnections(root, target);
  psqlAdmin(root, target, target.dockerAdminUrl, `DROP DATABASE IF EXISTS "${db}";`);
  psqlAdmin(root, target, target.dockerAdminUrl, `CREATE DATABASE "${db}";`);
}

/**
 * @param {string} root
 * @param {ReturnType<typeof import('./target.mjs').resolveTarget>} target
 * @param {string} inputPath
 */
export function pgRestoreFromFile(root, target, inputPath) {
  const pg = parsePgUrl(target.dockerDatabaseUrl);
  const containerIn = inputPath.includes('baseline')
    ? `/db/baseline/${path.basename(inputPath)}`
    : `/db/backups/${path.basename(inputPath)}`;

  const result = runDocker(
    dockerComposeRun(root, target, [
      'pg_restore',
      '-h',
      pg.host,
      '-p',
      pg.port,
      '-U',
      pg.user,
      '-d',
      pg.database,
      '--no-owner',
      '--no-acl',
      '--exit-on-error',
      containerIn,
    ], { PGPASSWORD: pg.password }),
  );

  const stderr = result.stderr || '';
  if (stderr.trim()) {
    console.warn(stderr.trim());
  }
  if (result.status !== 0) {
    throw new Error(stderr || 'pg_restore failed');
  }
}

/**
 * @param {string} root
 * @param {ReturnType<typeof import('./target.mjs').resolveTarget>} target
 */
export function verifyDatabaseConnect(root, target) {
  const pg = parsePgUrl(target.dockerDatabaseUrl);
  runDocker(
    dockerComposeRun(root, target, [
      'psql',
      '-h',
      pg.host,
      '-p',
      pg.port,
      '-U',
      pg.user,
      '-d',
      pg.database,
      '-c',
      'SELECT 1',
    ], { PGPASSWORD: pg.password }),
  );
}
