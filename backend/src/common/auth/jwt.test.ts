import { describe, expect, it } from 'vitest';

import { signAccessToken, verifyAccessToken } from './jwt.js';

describe('access tokens', () => {
  it('round-trips the user id through sign/verify', () => {
    const token = signAccessToken('11111111-1111-1111-1111-111111111111');
    const payload = verifyAccessToken(token);
    expect(payload.userId).toBe('11111111-1111-1111-1111-111111111111');
  });

  it('rejects a tampered token', () => {
    const token = signAccessToken('11111111-1111-1111-1111-111111111111');
    expect(() => verifyAccessToken(`${token}tampered`)).toThrow();
  });
});
