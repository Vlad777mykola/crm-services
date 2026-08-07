import { describe, expect, it } from 'vitest';

import { computeBackoffMs } from './poll-and-publish.js';

describe('computeBackoffMs', () => {
  it('doubles the delay for each additional attempt', () => {
    expect(computeBackoffMs(0)).toBe(1000);
    expect(computeBackoffMs(1)).toBe(2000);
    expect(computeBackoffMs(2)).toBe(4000);
    expect(computeBackoffMs(3)).toBe(8000);
  });

  it('caps the delay at 60 seconds', () => {
    expect(computeBackoffMs(10)).toBe(60_000);
    expect(computeBackoffMs(20)).toBe(60_000);
  });
});
