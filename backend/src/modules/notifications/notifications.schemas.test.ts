import { describe, expect, it } from 'vitest';

import { notificationIdParamsSchema } from './notifications.schemas.js';

describe('notificationIdParamsSchema', () => {
  it('accepts a valid uuid', () => {
    expect(notificationIdParamsSchema.safeParse({ notificationId: '123e4567-e89b-12d3-a456-426614174000' }).success).toBe(
      true,
    );
  });

  it('rejects a missing notificationId', () => {
    expect(notificationIdParamsSchema.safeParse({}).success).toBe(false);
  });

  it('rejects a non-uuid notificationId', () => {
    expect(notificationIdParamsSchema.safeParse({ notificationId: 'not-a-uuid' }).success).toBe(false);
  });
});
