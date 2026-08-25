import { buildPaginationMeta, resolvePagination, type PaginationMeta } from '../../../common/pagination.js';
import type { SpecialistProfileRow } from '../../../db/specialist-repository.js';
import type { SpecialistReadRepository } from '../../ports/specialist-repositories.js';
import type { ListPublicSpecialistsQuery } from './list-public-specialists.query.js';

export class ListPublicSpecialistsHandler {
  constructor(private readonly reads: SpecialistReadRepository) {}

  async execute(query: ListPublicSpecialistsQuery): Promise<{ items: SpecialistProfileRow[]; meta: PaginationMeta }> {
    const { page, pageSize, skip, take } = resolvePagination(query.input);
    const { items, total } = await this.reads.listPublic({
      q: query.input.q,
      category: query.input.category,
      city: query.input.city,
      remoteOnly: query.input.remoteOnly,
      skip,
      take,
    });
    return { items, meta: buildPaginationMeta(page, pageSize, total) };
  }
}
