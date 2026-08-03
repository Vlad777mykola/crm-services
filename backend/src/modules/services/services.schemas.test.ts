import { describe, expect, it } from 'vitest';

import {
  createServiceRequestSchema,
  publicServicesQuerySchema,
  serviceIdParamsSchema,
  serviceOnlyIdParamsSchema,
  updateServiceRequestSchema,
} from './services.schemas.js';

describe('createServiceRequestSchema', () => {
  it('accepts a payload with only the required fields', () => {
    const result = createServiceRequestSchema.safeParse({ name: 'Haircut', durationMinutes: 30 });
    expect(result.success).toBe(true);
  });

  it('accepts a full payload', () => {
    const result = createServiceRequestSchema.safeParse({
      name: 'Haircut',
      description: 'A classic haircut',
      category: 'hair',
      durationMinutes: 45,
      price: '25.00',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a missing name', () => {
    const result = createServiceRequestSchema.safeParse({ durationMinutes: 30 });
    expect(result.success).toBe(false);
  });

  it('rejects an empty name', () => {
    const result = createServiceRequestSchema.safeParse({ name: '', durationMinutes: 30 });
    expect(result.success).toBe(false);
  });

  it('rejects a missing durationMinutes', () => {
    const result = createServiceRequestSchema.safeParse({ name: 'Haircut' });
    expect(result.success).toBe(false);
  });

  it('rejects a non-positive durationMinutes', () => {
    const result = createServiceRequestSchema.safeParse({ name: 'Haircut', durationMinutes: 0 });
    expect(result.success).toBe(false);
  });
});

describe('updateServiceRequestSchema', () => {
  it('accepts an empty patch', () => {
    const result = updateServiceRequestSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts clearing nullable fields', () => {
    const result = updateServiceRequestSchema.safeParse({ description: null, category: null, price: null });
    expect(result.success).toBe(true);
  });

  it('accepts publishing a service', () => {
    const result = updateServiceRequestSchema.safeParse({ status: 'published' });
    expect(result.success).toBe(true);
  });

  it('rejects setting status to suspended (moderation-only state)', () => {
    const result = updateServiceRequestSchema.safeParse({ status: 'suspended' });
    expect(result.success).toBe(false);
  });
});

describe('serviceIdParamsSchema', () => {
  it('accepts valid uuids', () => {
    const result = serviceIdParamsSchema.safeParse({
      companyId: '123e4567-e89b-12d3-a456-426614174000',
      serviceId: '123e4567-e89b-12d3-a456-426614174001',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a non-uuid serviceId', () => {
    const result = serviceIdParamsSchema.safeParse({
      companyId: '123e4567-e89b-12d3-a456-426614174000',
      serviceId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });
});

describe('serviceOnlyIdParamsSchema', () => {
  it('accepts a valid uuid', () => {
    const result = serviceOnlyIdParamsSchema.safeParse({ serviceId: '123e4567-e89b-12d3-a456-426614174000' });
    expect(result.success).toBe(true);
  });

  it('rejects a non-uuid serviceId', () => {
    const result = serviceOnlyIdParamsSchema.safeParse({ serviceId: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });
});

describe('publicServicesQuerySchema', () => {
  it('accepts an empty query', () => {
    const result = publicServicesQuerySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts search and filter params with coerced pagination', () => {
    const result = publicServicesQuerySchema.safeParse({ q: 'haircut', category: 'hair', page: '2', pageSize: '10' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ q: 'haircut', category: 'hair', page: 2, pageSize: 10 });
    }
  });

  it('rejects an empty q', () => {
    const result = publicServicesQuerySchema.safeParse({ q: '' });
    expect(result.success).toBe(false);
  });
});
