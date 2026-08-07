import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Dummy value only - satisfies src/env.ts's required fields so importing
    // any module that transitively loads env.ts doesn't crash the test run
    // when no real .env file is present (e.g. in CI).
    env: {
      RABBITMQ_URL: 'amqp://test:test@localhost:5672',
    },
  },
});
