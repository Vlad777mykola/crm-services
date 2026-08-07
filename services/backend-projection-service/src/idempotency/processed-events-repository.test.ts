import { describe, expect, it, vi } from 'vitest';

import { ProcessedEventsRepository } from './processed-events-repository.js';

describe('ProcessedEventsRepository', () => {
  it('returns true the first time an event is marked processed', async () => {
    const pool = { query: vi.fn().mockResolvedValue({ rowCount: 1 }) };
    const repository = new ProcessedEventsRepository(pool as never);

    await expect(repository.markProcessed('event-1')).resolves.toBe(true);
  });

  it('returns false when the event was already processed', async () => {
    const pool = { query: vi.fn().mockResolvedValue({ rowCount: 0 }) };
    const repository = new ProcessedEventsRepository(pool as never);

    await expect(repository.markProcessed('event-1')).resolves.toBe(false);
  });
});
