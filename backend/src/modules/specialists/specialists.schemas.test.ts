import { describe, expect, it } from 'vitest';

import {
  createSpecialistProfileRequestSchema,
  specialistIdParamsSchema,
  updateSpecialistProfileRequestSchema,
} from './specialists.schemas.js';

describe('createSpecialistProfileRequestSchema', () => {
  it('accepts a payload with only the required displayName', () => {
    const result = createSpecialistProfileRequestSchema.safeParse({ displayName: 'Jane Doe' });
    expect(result.success).toBe(true);
  });

  it('accepts a full payload', () => {
    const result = createSpecialistProfileRequestSchema.safeParse({
      displayName: 'Jane Doe',
      headline: 'Senior hair stylist',
      bio: '10 years of experience',
      category: 'hair salon',
      city: 'Berlin',
      isRemoteSupported: false,
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty displayName', () => {
    const result = createSpecialistProfileRequestSchema.safeParse({ displayName: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a missing displayName', () => {
    const result = createSpecialistProfileRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('updateSpecialistProfileRequestSchema', () => {
  it('accepts an empty patch', () => {
    const result = updateSpecialistProfileRequestSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts clearing nullable fields', () => {
    const result = updateSpecialistProfileRequestSchema.safeParse({
      headline: null,
      bio: null,
      category: null,
      city: null,
    });
    expect(result.success).toBe(true);
  });

  it('accepts publishing a profile', () => {
    const result = updateSpecialistProfileRequestSchema.safeParse({ status: 'published' });
    expect(result.success).toBe(true);
  });

  it('rejects setting status to suspended (moderation-only state)', () => {
    const result = updateSpecialistProfileRequestSchema.safeParse({ status: 'suspended' });
    expect(result.success).toBe(false);
  });

  it('rejects an empty displayName', () => {
    const result = updateSpecialistProfileRequestSchema.safeParse({ displayName: '' });
    expect(result.success).toBe(false);
  });
});

describe('specialistIdParamsSchema', () => {
  it('accepts a valid uuid', () => {
    const result = specialistIdParamsSchema.safeParse({ specialistId: '123e4567-e89b-12d3-a456-426614174000' });
    expect(result.success).toBe(true);
  });

  it('rejects a non-uuid specialistId', () => {
    const result = specialistIdParamsSchema.safeParse({ specialistId: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });
});
