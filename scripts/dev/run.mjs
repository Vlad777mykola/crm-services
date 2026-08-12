import path from 'node:path';
import { fileURLToPath } from 'node:url';

import concurrently from 'concurrently';

import { BUNDLES, OUTBOX, PREFIX_COLORS, SERVICES } from './bundles.mjs';
import { crossEnvLocal } from './local-dev-env.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function resolveKey(key) {
  if (key === 'frontend') {
    return {
      name: 'frontend',
      command:
        'cross-env VITE_API_URL=http://localhost:8080 yarn workspace @crm/frontend dev',
      cwd: ROOT,
    };
  }

  if (key.startsWith('outbox:')) {
    const id = key.slice('outbox:'.length);
    const outbox = OUTBOX[id];
    if (!outbox) throw new Error(`Unknown outbox: ${id}. Run: yarn dev:list`);
    return {
      name: `outbox-${id}`,
      command: `${crossEnvLocal({ OUTBOX_SCHEMA: outbox.schema, HEALTH_PORT: outbox.healthPort })} yarn dev`,
      cwd: path.join(ROOT, 'services/outbox-publisher'),
    };
  }

  const service = SERVICES[key];
  if (!service) throw new Error(`Unknown service: ${key}. Run: yarn dev:list`);
  return {
    name: key,
    command: `${crossEnvLocal()} yarn dev`,
    cwd: path.join(ROOT, service.dir),
  };
}

/** @param {string[]} keys */
function commandsForKeys(keys) {
  return keys.map((key) => resolveKey(key));
}

function printList() {
  console.log('Local microservice dev — run from repo root after yarn dev:infra\n');
  console.log('Infrastructure (separate terminal, keep running):');
  console.log('  yarn dev:infra     Postgres + RabbitMQ + Traefik gateway on :8080\n');
  console.log('Bundles (yarn dev:<name> or yarn dev:run <name>):');
  for (const [name, bundle] of Object.entries(BUNDLES)) {
    console.log(`  ${name.padEnd(22)} ${bundle.description}`);
  }
  console.log('\nSingle service (yarn dev:svc:<name> or yarn dev:run svc <name>):');
  for (const [id, svc] of Object.entries(SERVICES)) {
    console.log(`  ${id.padEnd(22)} :${svc.port}  ${svc.label}`);
  }
  console.log('\nOutbox publisher (yarn dev:outbox:<name> or yarn dev:run outbox <name>):');
  for (const [id, ob] of Object.entries(OUTBOX)) {
    console.log(`  ${id.padEnd(22)} health :${ob.healthPort}  ${ob.schema}`);
  }
  console.log('\nExamples:');
  console.log('  yarn dev:auth:app       # login/register in the browser');
  console.log('  yarn dev:companies      # /companies public list');
  console.log('  yarn dev:run svc auth   # only auth-service on :4001');
  console.log('  yarn dev:run outbox auth companies  # two outbox instances\n');
}

async function runCommands(commands) {
  const { result } = concurrently(commands, {
    prefix: 'name',
    prefixColors: PREFIX_COLORS,
    cwd: ROOT,
  });
  await result;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === 'list') {
    printList();
    return;
  }

  const mode = args[0];

  if (mode === 'svc') {
    const ids = args.slice(1);
    if (ids.length === 0) {
      console.error('Usage: yarn dev:run svc <auth|users|companies|...>');
      process.exit(1);
    }
    await runCommands(commandsForKeys(ids));
    return;
  }

  if (mode === 'outbox') {
    const ids = args.slice(1);
    if (ids.length === 0) {
      console.error('Usage: yarn dev:run outbox <auth|companies|...>');
      process.exit(1);
    }
    await runCommands(commandsForKeys(ids.map((id) => `outbox:${id}`)));
    return;
  }

  const bundle = BUNDLES[mode];
  if (!bundle) {
    console.error(`Unknown bundle "${mode}". Run: yarn dev:list`);
    process.exit(1);
  }

  console.log(`[dev] ${mode}: ${bundle.description}`);
  await runCommands(commandsForKeys(bundle.keys));
}

main().catch((err) => {
  console.error('[dev] failed:', err);
  process.exit(1);
});
