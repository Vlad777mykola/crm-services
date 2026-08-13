/**
 * Environment for docker/test isolated stack (never dev :5432 / :4001).
 */

import {
  JWT_ACCESS_SECRET,
  TEST_DATABASE_URL,
  TEST_GATEWAY_PORT,
  TEST_RABBITMQ_URL,
} from './port-registry.mjs';

export const TEST_ENV = {
  DATABASE_URL: TEST_DATABASE_URL,
  RABBITMQ_URL: TEST_RABBITMQ_URL,
  JWT_ACCESS_SECRET,
  VITE_API_URL: `http://localhost:${TEST_GATEWAY_PORT}`,
};

/** @param {Record<string, string | number>} extra */
export function mergeTestEnv(extra = {}) {
  const vars = { ...TEST_ENV };
  for (const [key, value] of Object.entries(extra)) {
    vars[key] = String(value);
  }
  return vars;
}
