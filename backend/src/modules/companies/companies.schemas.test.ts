import { describe, expect, it } from 'vitest';

import { companyIdParamsSchema, createCompanyRequestSchema, updateCompanyRequestSchema } from './companies.schemas.js';

describe('createCompanyRequestSchema', () => {
  it('accepts a payload with only the required name', () => {
    const result = createCompanyRequestSchema.safeParse({ name: 'Acme Dental' });
    expect(result.success).toBe(true);
  });

  it('accepts a full payload', () => {
    const result = createCompanyRequestSchema.safeParse({
      name: 'Acme Dental',
      description: 'A friendly dental clinic',
      category: 'dental',
      website: 'https://acme.example.com',
      phone: '+1234567890',
      email: 'hello@acme.example.com',
      isRemoteSupported: true,
      city: 'Berlin',
      address: 'Main street 1',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty name', () => {
    const result = createCompanyRequestSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a missing name', () => {
    const result = createCompanyRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('updateCompanyRequestSchema', () => {
  it('accepts an empty patch', () => {
    const result = updateCompanyRequestSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts clearing nullable fields', () => {
    const result = updateCompanyRequestSchema.safeParse({
      description: null,
      category: null,
      website: null,
      phone: null,
      email: null,
      city: null,
      address: null,
    });
    expect(result.success).toBe(true);
  });

  it('accepts publishing a company', () => {
    const result = updateCompanyRequestSchema.safeParse({ status: 'published' });
    expect(result.success).toBe(true);
  });

  it('rejects setting status to suspended (moderation-only state)', () => {
    const result = updateCompanyRequestSchema.safeParse({ status: 'suspended' });
    expect(result.success).toBe(false);
  });

  it('rejects an empty name', () => {
    const result = updateCompanyRequestSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });
});

describe('companyIdParamsSchema', () => {
  it('accepts a valid uuid', () => {
    const result = companyIdParamsSchema.safeParse({ companyId: '123e4567-e89b-12d3-a456-426614174000' });
    expect(result.success).toBe(true);
  });

  it('rejects a non-uuid companyId', () => {
    const result = companyIdParamsSchema.safeParse({ companyId: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });
});
