import { describe, expect, it } from 'vitest';

import { createReviewRequestSchema } from './reviews.schemas.js';

describe('createReviewRequestSchema', () => {
  it('accepts a valid rating without a comment', () => {
    expect(createReviewRequestSchema.safeParse({ rating: 5 }).success).toBe(true);
  });

  it('accepts a valid rating with a comment', () => {
    expect(createReviewRequestSchema.safeParse({ rating: 4, comment: 'Great service!' }).success).toBe(true);
  });

  it('rejects a missing rating', () => {
    expect(createReviewRequestSchema.safeParse({}).success).toBe(false);
  });

  it('rejects a rating below 1', () => {
    expect(createReviewRequestSchema.safeParse({ rating: 0 }).success).toBe(false);
  });

  it('rejects a rating above 5', () => {
    expect(createReviewRequestSchema.safeParse({ rating: 6 }).success).toBe(false);
  });

  it('rejects a non-integer rating', () => {
    expect(createReviewRequestSchema.safeParse({ rating: 3.5 }).success).toBe(false);
  });
});
