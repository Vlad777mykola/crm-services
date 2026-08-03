import { describe, expect, it } from 'vitest';

import { buildPaginationMeta, paginationQuerySchema, resolvePagination } from './pagination.js';

describe('paginationQuerySchema', () => {
  it('accepts an empty query', () => {
    const result = paginationQuerySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('coerces string query params to numbers', () => {
    const result = paginationQuerySchema.safeParse({ page: '2', pageSize: '10' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ page: 2, pageSize: 10 });
    }
  });

  it('rejects a page below 1', () => {
    const result = paginationQuerySchema.safeParse({ page: '0' });
    expect(result.success).toBe(false);
  });

  it('rejects a pageSize above the max', () => {
    const result = paginationQuerySchema.safeParse({ pageSize: '51' });
    expect(result.success).toBe(false);
  });

  it('rejects a non-numeric page', () => {
    const result = paginationQuerySchema.safeParse({ page: 'abc' });
    expect(result.success).toBe(false);
  });
});

describe('resolvePagination', () => {
  it('defaults to page 1 and pageSize 20', () => {
    expect(resolvePagination({})).toEqual({ page: 1, pageSize: 20, skip: 0, take: 20 });
  });

  it('computes skip/take from the given page and pageSize', () => {
    expect(resolvePagination({ page: 3, pageSize: 10 })).toEqual({ page: 3, pageSize: 10, skip: 20, take: 10 });
  });
});

describe('buildPaginationMeta', () => {
  it('computes totalPages by rounding up', () => {
    expect(buildPaginationMeta(1, 20, 45)).toEqual({ page: 1, pageSize: 20, total: 45, totalPages: 3 });
  });

  it('handles zero results', () => {
    expect(buildPaginationMeta(1, 20, 0)).toEqual({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  });
});
