/**
 * Dev + verify port registry. Single source for orchestration and Traefik generation.
 * Verify ports = dev + 10000 (frontend uses VERIFY_FRONTEND_PORT).
 */

import { OUTBOX, SERVICES } from './bundles.mjs';

export const DEV_GATEWAY_PORT = 8080;
export const DEV_FRONTEND_PORT = 5173;
export const VERIFY_PROJECT = 'crm-verify';
export const VERIFY_PORT_OFFSET = 10000;
export const VERIFY_FRONTEND_PORT = 15173;
export const VERIFY_GATEWAY_PORT = 28080;
export const VERIFY_POSTGRES_PORT = 25432;
export const VERIFY_RABBITMQ_PORT = 25672;
export const VERIFY_RABBITMQ_MGMT_PORT = 25673;
export const VERIFY_POSTGRES_AI_PORT = 25433;

/** @param {number} devPort */
export function verifyAppPort(devPort) {
  return devPort + VERIFY_PORT_OFFSET;
}

export const EXTRA_WORKERS = {
  metrics: {
    dir: 'services/metrics-service',
    devPort: 4100,
    label: 'metrics-service',
    portEnvKey: 'METRICS_PORT',
  },
  ai: {
    dir: 'services/ai-service',
    devPort: 4200,
    label: 'ai-service',
    portEnvKey: 'AI_SERVICE_HEALTH_PORT',
  },
};

export function verifyDatabaseUrl() {
  return `postgres://postgres:postgres@localhost:${VERIFY_POSTGRES_PORT}/crm`;
}

export function verifyAiDatabaseUrl() {
  return `postgres://ai:ai_password@localhost:${VERIFY_POSTGRES_AI_PORT}/ai`;
}

export function verifyRabbitmqUrl() {
  return `amqp://crm:crm_local_only@localhost:${VERIFY_RABBITMQ_PORT}`;
}

export const JWT_ACCESS_SECRET = 'dev-access-secret-change-me';

/** All dev ports that need remapping in Traefik verify config */
export function allDevAppPorts() {
  const ports = new Set();
  for (const svc of Object.values(SERVICES)) {
    ports.add(svc.port);
  }
  for (const ob of Object.values(OUTBOX)) {
    ports.add(ob.healthPort);
  }
  for (const w of Object.values(EXTRA_WORKERS)) {
    ports.add(w.devPort);
  }
  return [...ports].sort((a, b) => a - b);
}

/** @param {number} devPort */
export function devPortToVerifyPort(devPort) {
  return verifyAppPort(devPort);
}
