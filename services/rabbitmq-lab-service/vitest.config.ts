import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'src/**/*.test.ts'],
    // Dummy value only - satisfies src/env.ts's required fields so importing
    // any module that transitively loads env.ts doesn't crash the test run
    // when no real .env file is present (e.g. in CI). Integration tests under
    // tests/integration/ still need a real broker (see docs/students/rabitmq/
    // lab-service/lesson docs and services/rabbitmq-lab-service/tests/README.md).
    env: {
      RABBITMQ_URL: 'amqp://test:test@localhost:5672',
      DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/crm',
      RETRY_TIER_1_MS: '100',
      RETRY_TIER_2_MS: '300',
      RETRY_TIER_3_MS: '1000',
    },
  },
});
