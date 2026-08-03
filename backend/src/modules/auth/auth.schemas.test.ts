import { describe, expect, it } from 'vitest';

import { loginRequestSchema, registerRequestSchema } from './auth.schemas.js';

describe('registerRequestSchema', () => {
  it('accepts a valid payload', () => {
    const result = registerRequestSchema.safeParse({
      email: 'jane@example.com',
      name: 'Jane',
      password: 'super-secret',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a password shorter than 8 characters', () => {
    const result = registerRequestSchema.safeParse({
      email: 'jane@example.com',
      name: 'Jane',
      password: 'short',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid email', () => {
    const result = registerRequestSchema.safeParse({
      email: 'not-an-email',
      name: 'Jane',
      password: 'super-secret',
    });
    expect(result.success).toBe(false);
  });
});

describe('loginRequestSchema', () => {
  it('accepts a valid payload', () => {
    const result = loginRequestSchema.safeParse({ email: 'jane@example.com', password: 'super-secret' });
    expect(result.success).toBe(true);
  });

  it('rejects an empty password', () => {
    const result = loginRequestSchema.safeParse({ email: 'jane@example.com', password: '' });
    expect(result.success).toBe(false);
  });
});
