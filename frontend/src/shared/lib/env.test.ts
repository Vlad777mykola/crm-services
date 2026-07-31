import { describe, expect, it } from 'vitest';

import { getApiUrl } from './env';

describe('getApiUrl', () => {
  it('returns a non-empty API base URL', () => {
    const url = getApiUrl();

    expect(typeof url).toBe('string');
    expect(url.length).toBeGreaterThan(0);
  });
});
