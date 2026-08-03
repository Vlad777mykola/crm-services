import { describe, expect, it } from 'vitest';

import { createUserRequestSchema, updateUserRequestSchema, userIdParamsSchema } from './users.schemas.js';

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

describe('updateUserRequestSchema', () => {
  it('accepts an empty patch', () => {
    const result = updateUserRequestSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts a partial patch with nullable fields cleared', () => {
    const result = updateUserRequestSchema.safeParse({ phone: null, city: null, bio: null });
    expect(result.success).toBe(true);
  });

  it('accepts a full patch', () => {
    const result = updateUserRequestSchema.safeParse({
      name: 'Jane Doe',
      phone: '+1234567890',
      city: 'Berlin',
      bio: 'Hello there',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty name', () => {
    const result = updateUserRequestSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });
});
