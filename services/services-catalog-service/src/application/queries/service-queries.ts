import type { DataSource } from 'typeorm';

import { buildPaginationMeta, resolvePagination, type PaginationMeta } from '../../common/pagination.js';
import { ServiceRepository, type ServiceRow, type StatusHistoryRow } from '../../db/service-repository.js';
import { AppError } from '../../errors/AppError.js';
import type { PublicServicesQueryInput } from '../../modules/services/services.schemas.js';
import { isOwnerOrManager, requireOwnerOrManager } from '../services/service-catalog-authorization.js';

export class ServiceQueries {
  constructor(
    private readonly dataSource: DataSource,
    private readonly repo: ServiceRepository,
  ) {}

  async listByCompany(companyId: string, requesterUserId: string | undefined): Promise<ServiceRow[]> {
    const canSeeAllStatuses = await isOwnerOrManager(this.dataSource, companyId, requesterUserId);
    return this.repo.listByCompany(companyId, !canSeeAllStatuses);
  }

  async listPublic(query: PublicServicesQueryInput): Promise<{ items: ServiceRow[]; meta: PaginationMeta }> {
    const { page, pageSize, skip, take } = resolvePagination(query);
    const { items, total } = await this.repo.listPublic({ q: query.q, category: query.category, skip, take });
    return { items, meta: buildPaginationMeta(page, pageSize, total) };
  }

  async getById(serviceId: string, requesterUserId: string | undefined): Promise<ServiceRow> {
    const service = await this.repo.findById(serviceId);
    if (!service) {
      throw new AppError('Service not found', 404);
    }
    if (service.status === 'published') {
      return service;
    }
    const canSee = await isOwnerOrManager(this.dataSource, service.companyId, requesterUserId);
    if (!canSee) {
      throw new AppError('Service not found', 404);
    }
    return service;
  }

  async getStatusHistory(companyId: string, serviceId: string, requesterUserId: string): Promise<StatusHistoryRow[]> {
    await requireOwnerOrManager(this.dataSource, companyId, requesterUserId);
    const service = await this.repo.findByIdAndCompany(serviceId, companyId);
    if (!service) {
      throw new AppError('Service not found', 404);
    }
    return this.repo.listStatusHistory(serviceId);
  }
}
