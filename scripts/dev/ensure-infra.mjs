import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const COMPOSE_INFRA = path.join(ROOT, 'docker/dev/compose.infra.yml');
const COMPOSE_GATEWAY = path.join(ROOT, 'docker/dev/compose.gateway.yml');

export function ensureDevInfra() {
  console.log('[dev] ensuring dev infrastructure (postgres, rabbitmq, traefik)…');
  execSync(
    `docker compose -f "${COMPOSE_INFRA}" -f "${COMPOSE_GATEWAY}" --profile events up -d --wait`,
    { cwd: ROOT, stdio: 'inherit' },
  );
  console.log('✓ Postgres, RabbitMQ, Traefik healthy');
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  ensureDevInfra();
}
