import {
  JWT_ACCESS_SECRET,
  verifyAiDatabaseUrl,
  verifyAppPort,
  verifyDatabaseUrl,
  verifyRabbitmqUrl,
  VERIFY_FRONTEND_PORT,
  VERIFY_GATEWAY_PORT,
} from './port-registry.mjs';
import { OUTBOX, SERVICES } from './bundles.mjs';

export const VERIFY_ENV = {
  DATABASE_URL: verifyDatabaseUrl(),
  RABBITMQ_URL: verifyRabbitmqUrl(),
  JWT_ACCESS_SECRET,
  AI_DATABASE_URL: verifyAiDatabaseUrl(),
  VITE_API_URL: `http://localhost:${VERIFY_GATEWAY_PORT}`,
};

/** @param {Record<string, string | number>} extra */
export function crossEnvVerify(extra = {}) {
  const vars = { ...VERIFY_ENV, ...extra };
  const parts = Object.entries(vars).map(([key, value]) => `${key}=${value}`);
  return `cross-env ${parts.join(' ')}`;
}

/** Env overrides for a domain service id from bundles.mjs */
export function serviceVerifyEnv(serviceId) {
  const svc = SERVICES[serviceId];
  if (!svc) throw new Error(`Unknown service: ${serviceId}`);
  const port = verifyAppPort(svc.port);
  if (serviceId === 'notifications') {
    return { HEALTH_PORT: port };
  }
  return { PORT: port };
}

/** Env overrides for an outbox id */
export function outboxVerifyEnv(outboxId) {
  const ob = OUTBOX[outboxId];
  if (!ob) throw new Error(`Unknown outbox: ${outboxId}`);
  return {
    OUTBOX_SCHEMA: ob.schema,
    HEALTH_PORT: verifyAppPort(ob.healthPort),
  };
}

export function frontendVerifyCommand() {
  return `cross-env VITE_API_URL=http://localhost:${VERIFY_GATEWAY_PORT} yarn workspace @crm/frontend dev -- --port ${VERIFY_FRONTEND_PORT} --strictPort`;
}
