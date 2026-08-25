import { buildPaginationMeta, resolvePagination, type PaginationMeta } from '../../../common/pagination.js';
import type {
  PublicSpecialistProfileView,
  PublicSpecialistProjectionRepository,
} from '../../../db/public-specialist-projection-repository.js';
import type { ListPublicSpecialistsQuery } from './list-public-specialists.query.js';

export class ListPublicSpecialistsHandler {
  constructor(private readonly reads: PublicSpecialistProjectionRepository) {}

  async execute(query: ListPublicSpecialistsQuery): Promise<{ items: PublicSpecialistProfileView[]; meta: PaginationMeta }> {
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
