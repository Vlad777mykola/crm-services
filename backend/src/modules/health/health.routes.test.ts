import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

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
