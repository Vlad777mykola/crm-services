import type { DataSource } from 'typeorm';

import { AppError } from '../../errors/AppError.js';
import { ServiceRepository, type ServiceRow, type StatusHistoryRow } from '../../db/service-repository.js';
import { findActiveMembershipRole } from '../../db/legacy-company-members-bridge.js';
import { recordOutboxEvent } from '../../outbox/outbox-repository.js';
import { buildPaginationMeta, resolvePagination, type PaginationMeta } from '../../common/pagination.js';
import type { CreateServiceRequestInput, PublicServicesQueryInput, UpdateServiceRequestInput } from './services.schemas.js';

const PUBLISHABLE_TRANSITIONS: Record<string, readonly string[]> = {
  draft: ['published'],
  published: ['draft'],
  suspended: [],
};

export class ServicesService {
  readonly repo: ServiceRepository;

  constructor(private readonly dataSource: DataSource) {
    this.repo = new ServiceRepository(dataSource);
  }

  private async requireOwnerOrManager(companyId: string, userId: string): Promise<void> {
    const role = await findActiveMembershipRole(this.dataSource, companyId, userId);
    if (role !== 'owner' && role !== 'manager') {
      throw new AppError('You do not have permission to manage this company', 403);
    }
  }

  private async isOwnerOrManager(companyId: string, userId: string | undefined): Promise<boolean> {
    if (!userId) return false;
    const role = await findActiveMembershipRole(this.dataSource, companyId, userId);
    return role === 'owner' || role === 'manager';
  }

  async create(companyId: string, requesterUserId: string, input: CreateServiceRequestInput): Promise<ServiceRow> {
    await this.requireOwnerOrManager(companyId, requesterUserId);

    return this.dataSource.transaction(async (manager) => {
      const service = await this.repo.insert(manager, {
        companyId,
        name: input.name,
        description: input.description ?? null,
        category: input.category ?? null,
        durationMinutes: input.durationMinutes,
        price: input.price ?? null,
      });

      await this.repo.insertStatusHistory(manager, {
        serviceId: service.id,
        fromStatus: null,
        toStatus: service.status,
        changedByUserId: requesterUserId,
      });

      await recordOutboxEvent(manager, {
        type: 'service.created',
        aggregateId: service.id,
        payload: { serviceId: service.id, companyId, name: service.name, status: service.status },
      });

      return service;
    });
  }

  async listByCompany(companyId: string, requesterUserId: string | undefined): Promise<ServiceRow[]> {
    const canSeeAllStatuses = await this.isOwnerOrManager(companyId, requesterUserId);
    return this.repo.listByCompany(companyId, !canSeeAllStatuses);
  }

  async listPublic(query: PublicServicesQueryInput): Promise<{ items: ServiceRow[]; meta: PaginationMeta }> {
    const { page, pageSize, skip, take } = resolvePagination(query);
    const { items, total } = await this.repo.listPublic({ q: query.q, category: query.category, skip, take });
    return { items, meta: buildPaginationMeta(page, pageSize, total) };
  }

  async getById(serviceId: string, requesterUserId: string | undefined): Promise<ServiceRow> {
    const service = await this.repo.findById(serviceId);
    if (!service) throw new AppError('Service not found', 404);

    if (service.status === 'published') return service;

    // Draft/suspended services are only visible to the owning company's active
    // owner/manager - report "not found" so anonymous visitors can't detect their existence.
    const canSee = await this.isOwnerOrManager(service.companyId, requesterUserId);
    if (!canSee) throw new AppError('Service not found', 404);
    return service;
  }

  async update(
    companyId: string,
    serviceId: string,
    requesterUserId: string,
    patch: UpdateServiceRequestInput,
  ): Promise<ServiceRow> {
    await this.requireOwnerOrManager(companyId, requesterUserId);

    return this.dataSource.transaction(async (manager) => {
      const existing = await this.repo.findByIdAndCompany(serviceId, companyId);
      if (!existing) throw new AppError('Service not found', 404);

      const fromStatus = existing.status;
      if (patch.status && patch.status !== fromStatus) {
        if (!(PUBLISHABLE_TRANSITIONS[fromStatus] ?? []).includes(patch.status)) {
          throw new AppError(
            fromStatus === 'suspended'
              ? 'This service has been suspended and cannot be republished'
              : `Cannot change status from "${fromStatus}" to "${patch.status}"`,
            409,
          );
        }
      }

      const updated = await this.repo.update(manager, serviceId, patch);

      if (updated.status !== fromStatus) {
        await this.repo.insertStatusHistory(manager, {
          serviceId: updated.id,
          fromStatus,
          toStatus: updated.status,
          changedByUserId: requesterUserId,
        });
      }

      await recordOutboxEvent(manager, {
        type: 'service.updated',
        aggregateId: updated.id,
        payload: { serviceId: updated.id, companyId, name: updated.name, status: updated.status },
      });

      return updated;
    });
  }

  async getStatusHistory(companyId: string, serviceId: string, requesterUserId: string): Promise<StatusHistoryRow[]> {
    await this.requireOwnerOrManager(companyId, requesterUserId);

    const service = await this.repo.findByIdAndCompany(serviceId, companyId);
    if (!service) throw new AppError('Service not found', 404);

    return this.repo.listStatusHistory(serviceId);
  }
}
