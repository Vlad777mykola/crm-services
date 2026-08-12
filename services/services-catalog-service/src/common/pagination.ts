import { z } from 'zod';

// Copied from backend/src/common/schemas/pagination.ts - services never import
// from `backend/src/*` (service-skeleton-standard.md), so shared utils like
// this are duplicated per service rather than referenced across the boundary.
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).optional(),
});

export type PaginationQueryInput = z.infer<typeof paginationQuerySchema>;

export interface ResolvedPagination {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function resolvePagination(params: PaginationQueryInput): ResolvedPagination {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;

  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function buildPaginationMeta(page: number, pageSize: number, total: number): PaginationMeta {
  return { page, pageSize, total, totalPages: pageSize > 0 ? Math.ceil(total / pageSize) : 0 };
}
