/** Defaults matching docker/dev/compose.infra.yml — injected by yarn dev:svc:* / bundles. */

export const LOCAL_DEV_ENV = {
  DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/crm',
  RABBITMQ_URL: 'amqp://crm:crm_local_only@localhost:5672',
  JWT_ACCESS_SECRET: 'dev-access-secret-change-me',
};

/** @param {Record<string, string | number>} extra */
export function crossEnvLocal(extra = {}) {
  const vars = { ...LOCAL_DEV_ENV, ...extra };
  const parts = Object.entries(vars).map(([key, value]) => `${key}=${value}`);
  return `cross-env ${parts.join(' ')}`;
}
