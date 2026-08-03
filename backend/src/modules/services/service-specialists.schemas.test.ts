import { describe, expect, it } from 'vitest';

import { assignServiceSpecialistRequestSchema, serviceSpecialistParamsSchema } from './service-specialists.schemas.js';

describe('assignServiceSpecialistRequestSchema', () => {
  it('accepts a valid specialistProfileId', () => {
    const result = assignServiceSpecialistRequestSchema.safeParse({
      specialistProfileId: '123e4567-e89b-12d3-a456-426614174000',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a missing specialistProfileId', () => {
    const result = assignServiceSpecialistRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects a non-uuid specialistProfileId', () => {
    const result = assignServiceSpecialistRequestSchema.safeParse({ specialistProfileId: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });
});

describe('serviceSpecialistParamsSchema', () => {
  it('accepts valid uuids', () => {
    const result = serviceSpecialistParamsSchema.safeParse({
      serviceId: '123e4567-e89b-12d3-a456-426614174000',
      specialistProfileId: '123e4567-e89b-12d3-a456-426614174001',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a non-uuid specialistProfileId', () => {
    const result = serviceSpecialistParamsSchema.safeParse({
      serviceId: '123e4567-e89b-12d3-a456-426614174000',
      specialistProfileId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });
});
