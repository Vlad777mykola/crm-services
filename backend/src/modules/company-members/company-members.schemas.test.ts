import { describe, expect, it } from 'vitest';

import { inviteMemberRequestSchema, memberIdParamsSchema, updateMemberRequestSchema } from './company-members.schemas.js';

describe('inviteMemberRequestSchema', () => {
  it('accepts a valid email', () => {
    const result = inviteMemberRequestSchema.safeParse({ email: 'manager@example.com' });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid email', () => {
    const result = inviteMemberRequestSchema.safeParse({ email: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('rejects a missing email', () => {
    const result = inviteMemberRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('updateMemberRequestSchema', () => {
  it('accepts active status', () => {
    const result = updateMemberRequestSchema.safeParse({ status: 'active' });
    expect(result.success).toBe(true);
  });

  it('accepts removed status', () => {
    const result = updateMemberRequestSchema.safeParse({ status: 'removed' });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid status', () => {
    const result = updateMemberRequestSchema.safeParse({ status: 'owner' });
    expect(result.success).toBe(false);
  });

  it('rejects a missing status', () => {
    const result = updateMemberRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('memberIdParamsSchema', () => {
  it('accepts valid uuids', () => {
    const result = memberIdParamsSchema.safeParse({
      companyId: '123e4567-e89b-12d3-a456-426614174000',
      memberId: '223e4567-e89b-12d3-a456-426614174000',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a non-uuid memberId', () => {
    const result = memberIdParamsSchema.safeParse({
      companyId: '123e4567-e89b-12d3-a456-426614174000',
      memberId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });
});
