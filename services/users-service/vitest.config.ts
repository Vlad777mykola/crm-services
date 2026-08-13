import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    env: {
      DATABASE_URL: process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/crm',
      RABBITMQ_URL: 'amqp://test:test@localhost:5672',
      JWT_ACCESS_SECRET: 'test-secret',
    },
  },
});
