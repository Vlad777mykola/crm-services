import { describe, expect, it } from 'vitest';

import { createUserRequestSchema, userIdParamsSchema } from './users.schemas.js';

describe('createUserRequestSchema', () => {
  it('accepts a valid payload', () => {
    const result = createUserRequestSchema.safeParse({ email: 'jane@example.com', name: 'Jane' });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid email', () => {
    const result = createUserRequestSchema.safeParse({ email: 'not-an-email', name: 'Jane' });
    expect(result.success).toBe(false);
  });

  it('rejects an empty name', () => {
    const result = createUserRequestSchema.safeParse({ email: 'jane@example.com', name: '' });
    expect(result.success).toBe(false);
  });
});

describe('userIdParamsSchema', () => {
  it('accepts a valid uuid', () => {
    const result = userIdParamsSchema.safeParse({ id: '123e4567-e89b-12d3-a456-426614174000' });
    expect(result.success).toBe(true);
  });

  it('rejects a non-uuid id', () => {
    const result = userIdParamsSchema.safeParse({ id: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });
});
