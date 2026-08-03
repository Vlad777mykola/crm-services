import { describe, expect, it } from 'vitest';

import { requestIdParamsSchema, sendSpecialistRequestSchema } from './company-specialists.schemas.js';

describe('sendSpecialistRequestSchema', () => {
  it('accepts a payload with only the required specialistProfileId', () => {
    const result = sendSpecialistRequestSchema.safeParse({
      specialistProfileId: '123e4567-e89b-12d3-a456-426614174000',
    });
    expect(result.success).toBe(true);
  });

  it('accepts an optional message', () => {
    const result = sendSpecialistRequestSchema.safeParse({
      specialistProfileId: '123e4567-e89b-12d3-a456-426614174000',
      message: 'We would love to have you on our team!',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a null message', () => {
    const result = sendSpecialistRequestSchema.safeParse({
      specialistProfileId: '123e4567-e89b-12d3-a456-426614174000',
      message: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejects a missing specialistProfileId', () => {
    const result = sendSpecialistRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects a non-uuid specialistProfileId', () => {
    const result = sendSpecialistRequestSchema.safeParse({ specialistProfileId: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });
});

describe('requestIdParamsSchema', () => {
  it('accepts a valid uuid', () => {
    const result = requestIdParamsSchema.safeParse({ requestId: '123e4567-e89b-12d3-a456-426614174000' });
    expect(result.success).toBe(true);
  });

  it('rejects a non-uuid requestId', () => {
    const result = requestIdParamsSchema.safeParse({ requestId: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });
});
