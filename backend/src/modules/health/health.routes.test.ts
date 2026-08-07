import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { mockDataSource } = vi.hoisted(() => ({
  mockDataSource: { isInitialized: true, query: vi.fn().mockResolvedValue([{ '?column?': 1 }]) },
}));

vi.mock('@/infrastructure/database/data-source.js', () => ({
  AppDataSource: mockDataSource,
}));

import { AppDataSource } from '@/infrastructure/database/data-source.js';

import { healthRouter } from './health.routes.js';

describe('GET /health', () => {
  it('returns a 200 with an ok status payload', async () => {
    const app = express();
    app.use(healthRouter);

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(typeof response.body.uptime).toBe('number');
    expect(typeof response.body.timestamp).toBe('string');
  });
});

describe('GET /health/live', () => {
  it('always returns ok without touching the database', async () => {
    const app = express();
    app.use(healthRouter);

    const response = await request(app).get('/health/live');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});

describe('GET /health/ready', () => {
  afterEach(() => {
    vi.mocked(AppDataSource.query).mockReset().mockResolvedValue([{ '?column?': 1 }]);
    mockDataSource.isInitialized = true;
  });

  it('returns ok when the database is initialized and reachable', async () => {
    const app = express();
    app.use(healthRouter);

    const response = await request(app).get('/health/ready');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('returns 503 when the database is not initialized', async () => {
    mockDataSource.isInitialized = false;
    const app = express();
    app.use(healthRouter);

    const response = await request(app).get('/health/ready');

    expect(response.status).toBe(503);
    expect(response.body.status).toBe('not-ready');
  });

  it('returns 503 when the database query fails', async () => {
    vi.mocked(AppDataSource.query).mockRejectedValue(new Error('connection refused'));
    const app = express();
    app.use(healthRouter);

    const response = await request(app).get('/health/ready');

    expect(response.status).toBe(503);
    expect(response.body.reason).toBe('connection refused');
  });
});
