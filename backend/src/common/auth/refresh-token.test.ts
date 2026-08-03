import { describe, expect, it } from 'vitest';

import { generateRefreshToken, hashRefreshToken } from './refresh-token.js';

describe('refresh tokens', () => {
  it('generates unique tokens', () => {
    expect(generateRefreshToken()).not.toBe(generateRefreshToken());
  });

  it('hashes deterministically', () => {
    const token = generateRefreshToken();
    expect(hashRefreshToken(token)).toBe(hashRefreshToken(token));
  });

  it('produces a different hash for a different token', () => {
    expect(hashRefreshToken(generateRefreshToken())).not.toBe(hashRefreshToken(generateRefreshToken()));
  });
});
