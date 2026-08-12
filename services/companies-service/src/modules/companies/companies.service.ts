import type { Pool } from 'pg';

import { AppError } from '../../errors/AppError.js';
import type { CompanyRow, StatusHistoryRow } from '../../db/company-repository.js';
import { CompanyRepository } from '../../db/company-repository.js';
import { findActiveMembershipRole, listActiveCompanyIdsForUser } from '../../db/legacy-company-members-bridge.js';
import { recordOutboxEvent } from '../../outbox/outbox-repository.js';
import { buildPaginationMeta, resolvePagination, type PaginationMeta } from '../../common/pagination.js';
import type { CreateCompanyRequestInput, PublicCompaniesQueryInput, UpdateCompanyRequestInput } from './companies.schemas.js';

// Same lifecycle used by services-catalog-service and specialists-service
// (audit/status-transition.ts PUBLISHABLE_STATUS_TRANSITIONS) - kept local
// per service-skeleton-standard.md (no cross-service imports).
const PUBLISHABLE_TRANSITIONS: Record<string, readonly string[]> = {
  draft: ['published'],
  published: ['draft'],
  suspended: [],
};

export interface CompanyMembership {
  role: 'owner' | 'manager';
  company: CompanyRow;
}

export class CompaniesService {
  private readonly companies: CompanyRepository;

  constructor(private readonly pool: Pool) {
    this.companies = new CompanyRepository(pool);
  }

  async create(input: CreateCompanyRequestInput, creatorUserId: string): Promise<CompanyRow> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const slug = await this.companies.generateUniqueSlug(client, input.name);
      const company = await this.companies.insert(client, {
        name: input.name,
        slug,
        description: input.description ?? null,
        category: input.category ?? null,
        website: input.website ?? null,
        phone: input.phone ?? null,
        email: input.email ?? null,
        isRemoteSupported: input.isRemoteSupported ?? false,
        city: input.city ?? null,
        address: input.address ?? null,
        createdByUserId: creatorUserId,
      });

      // The `owner` row is created by company-members-service's own
      // company.created consumer (Phase 5), not here - see
      // services/company-members-service/src/handlers/company-created.ts.

      await this.companies.insertStatusHistory(client, {
        companyId: company.id,
        fromStatus: null,
        toStatus: company.status,
        changedByUserId: creatorUserId,
      });

      await recordOutboxEvent(client, {
        type: 'company.created',
        aggregateId: company.id,
        payload: { companyId: company.id, name: company.name, slug: company.slug, createdByUserId: creatorUserId },
      });

      await client.query('COMMIT');
      return company;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getPublic(
    query: PublicCompaniesQueryInput,
  ): Promise<{ items: CompanyRow[]; meta: PaginationMeta }> {
    const { page, pageSize, skip, take } = resolvePagination(query);
    const { items, total } = await this.companies.listPublic({ q: query.q, category: query.category, city: query.city, skip, take });
    return { items, meta: buildPaginationMeta(page, pageSize, total) };
  }

  async getMyCompanies(userId: string): Promise<CompanyMembership[]> {
    const client = await this.pool.connect();
    try {
      const memberships = await listActiveCompanyIdsForUser(client, userId);
      if (memberships.length === 0) return [];

      const companies = await this.companies.findByIds(memberships.map((m) => m.companyId));
      const byId = new Map(companies.map((c) => [c.id, c]));

      return memberships
        .filter((m) => byId.has(m.companyId))
        .map((m) => ({ role: m.role, company: byId.get(m.companyId)! }));
    } finally {
      client.release();
    }
  }

  async getById(companyId: string, requesterUserId: string | undefined): Promise<CompanyRow> {
    const company = await this.companies.findById(companyId);
    if (!company) {
      throw new AppError('Company not found', 404);
    }

    if (company.status === 'published') {
      return company;
    }

    // Draft/suspended companies are only visible to their active members -
    // report "not found" (not 403) so anonymous visitors can't detect existence.
    const client = await this.pool.connect();
    try {
      const role = requesterUserId ? await findActiveMembershipRole(client, companyId, requesterUserId) : undefined;
      if (!role) {
        throw new AppError('Company not found', 404);
      }
      return company;
    } finally {
      client.release();
    }
  }

  private async requireOwnerOrManager(companyId: string, userId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      const role = await findActiveMembershipRole(client, companyId, userId);
      if (!role || !['owner', 'manager'].includes(role)) {
        throw new AppError('You do not have permission to manage this company', 403);
      }
    } finally {
      client.release();
    }
  }

  async update(companyId: string, requesterUserId: string, patch: UpdateCompanyRequestInput): Promise<CompanyRow> {
    await this.requireOwnerOrManager(companyId, requesterUserId);

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const existing = await this.companies.findByIdWithClient(client, companyId);
      if (!existing) {
        throw new AppError('Company not found', 404);
      }

      const fromStatus = existing.status;
      if (patch.status && patch.status !== fromStatus) {
        if (!(PUBLISHABLE_TRANSITIONS[fromStatus] ?? []).includes(patch.status)) {
          throw new AppError(
            fromStatus === 'suspended'
              ? 'This company has been suspended and cannot be republished'
              : `Cannot change status from "${fromStatus}" to "${patch.status}"`,
            409,
          );
        }
      }

      const updated = await this.companies.update(client, companyId, patch);

      if (updated.status !== fromStatus) {
        await this.companies.insertStatusHistory(client, {
          companyId,
          fromStatus,
          toStatus: updated.status,
          changedByUserId: requesterUserId,
        });
      }

      await recordOutboxEvent(client, {
        type: 'company.updated',
        aggregateId: companyId,
        payload: { companyId, name: updated.name, status: updated.status },
      });

      await client.query('COMMIT');
      return updated;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getStatusHistory(companyId: string, requesterUserId: string): Promise<StatusHistoryRow[]> {
    await this.requireOwnerOrManager(companyId, requesterUserId);
    return this.companies.listStatusHistory(companyId);
  }
}
