import { describe, expect, it } from 'vitest';

import { cancelWorker, getWorkQueueState, peekOneJobViaBasicGet, publishWork } from '../../src/labs/work-queue/index.js';

describe('work queue lab before connecting', () => {
  it('publishWork throws a clear error instead of a null-channel crash', () => {
    expect(() => publishWork(1)).toThrow(/not connected/);
  });

  it('cancelWorker throws a clear error instead of a null-channel crash', async () => {
    await expect(cancelWorker('A')).rejects.toThrow(/not connected/);
  });

  it('peekOneJobViaBasicGet throws a clear error instead of a null-channel crash', async () => {
    await expect(peekOneJobViaBasicGet()).rejects.toThrow(/not connected/);
  });

  it('reports both workers as inactive with zero processed jobs', () => {
    const state = getWorkQueueState();
    expect(state.workers.A).toEqual({ active: false, processed: 0, history: [] });
    expect(state.workers.B).toEqual({ active: false, processed: 0, history: [] });
  });
});
