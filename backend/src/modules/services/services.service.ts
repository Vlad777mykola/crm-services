import type { Repository } from 'typeorm';

import { AppError } from '@/common/errors/AppError.js';
import { findActiveCompanyMembership, requireCompanyRole } from '@/common/permissions/companyPermissions.js';
import { buildPaginationMeta, resolvePagination, type PaginationMeta } from '@/common/schemas/pagination.js';
import { AppDataSource } from '@/infrastructure/database/data-source.js';
import { AuditEntityType, type StatusHistoryEntry } from '@/modules/audit/status-history.entity.js';
import { listStatusHistory, recordStatusChange } from '@/modules/audit/status-history.service.js';
import { assertTransitionAllowed, PUBLISHABLE_STATUS_TRANSITIONS } from '@/modules/audit/status-transition.js';
import { CompanyMemberRole } from '@/modules/company-members/company-member.entity.js';

import { Service, ServiceStatus } from './service.entity.js';
import type { CreateServiceRequestInput, PublicServicesQueryInput, UpdateServiceRequestInput } from './services.schemas.js';

function getServiceRepository(): Repository<Service> {
  return AppDataSource.getRepository(Service);
}

export async function createService(
  companyId: string,
  requesterUserId: string,
  input: CreateServiceRequestInput,
): Promise<Service> {
  await requireCompanyRole(companyId, requesterUserId, [CompanyMemberRole.OWNER, CompanyMemberRole.MANAGER]);

  const repository = getServiceRepository();
  const service = await repository.save(
    repository.create({
      companyId,
      name: input.name,
      description: input.description ?? null,
      category: input.category ?? null,
      durationMinutes: input.durationMinutes,
      price: input.price ?? null,
      status: ServiceStatus.DRAFT,
    }),
  );

  await recordStatusChange(AuditEntityType.SERVICE, service.id, null, service.status, requesterUserId);

  return service;
}

export async function listCompanyServices(companyId: string, requesterUserId: string | undefined): Promise<Service[]> {
  const repository = getServiceRepository();

  const membership = requesterUserId ? await findActiveCompanyMembership(companyId, requesterUserId) : null;
  const canSeeAllStatuses = membership && [CompanyMemberRole.OWNER, CompanyMemberRole.MANAGER].includes(membership.role);

  return repository.find({
    where: canSeeAllStatuses ? { companyId } : { companyId, status: ServiceStatus.PUBLISHED },
    order: { createdAt: 'DESC' },
  });
}

export interface PublicServicesResult {
  items: Service[];
  meta: PaginationMeta;
}

export async function listPublicServices(query: PublicServicesQueryInput): Promise<PublicServicesResult> {
  const repository = getServiceRepository();
  const { page, pageSize, skip, take } = resolvePagination(query);

  const qb = repository
    .createQueryBuilder('service')
    .leftJoinAndSelect('service.company', 'company')
    .where('service.status = :status', { status: ServiceStatus.PUBLISHED });

  if (query.q) {
    qb.andWhere('(service.name ILIKE :q OR service.description ILIKE :q)', { q: `%${query.q}%` });
  }
  if (query.category) {
    qb.andWhere('service.category ILIKE :category', { category: `%${query.category}%` });
  }

  qb.orderBy('service.createdAt', 'DESC').skip(skip).take(take);

  const [items, total] = await qb.getManyAndCount();

  return { items, meta: buildPaginationMeta(page, pageSize, total) };
}

export async function getServiceById(serviceId: string, requesterUserId: string | undefined): Promise<Service> {
  const repository = getServiceRepository();
  const service = await repository.findOne({ where: { id: serviceId }, relations: { company: true } });

  if (!service) {
    throw new AppError('Service not found', 404);
  }

  if (service.status === ServiceStatus.PUBLISHED) {
    return service;
  }

  // Draft/suspended services are only visible to the owning company's active
  // owner/manager - report "not found" so anonymous visitors can't detect their existence.
  const membership = requesterUserId ? await findActiveCompanyMembership(service.companyId, requesterUserId) : null;
  if (!membership || ![CompanyMemberRole.OWNER, CompanyMemberRole.MANAGER].includes(membership.role)) {
    throw new AppError('Service not found', 404);
  }

  return service;
}

export async function updateService(
  companyId: string,
  serviceId: string,
  requesterUserId: string,
  patch: UpdateServiceRequestInput,
): Promise<Service> {
  await requireCompanyRole(companyId, requesterUserId, [CompanyMemberRole.OWNER, CompanyMemberRole.MANAGER]);

  const repository = getServiceRepository();
  const service = await repository.findOne({ where: { id: serviceId, companyId } });

  if (!service) {
    throw new AppError('Service not found', 404);
  }

  const fromStatus = service.status;
  if (patch.status && patch.status !== fromStatus) {
    assertTransitionAllowed(
      PUBLISHABLE_STATUS_TRANSITIONS,
      fromStatus,
      patch.status,
      fromStatus === ServiceStatus.SUSPENDED ? 'This service has been suspended and cannot be republished' : undefined,
    );
  }

  Object.assign(service, patch);
  const saved = await repository.save(service);

  if (saved.status !== fromStatus) {
    await recordStatusChange(AuditEntityType.SERVICE, saved.id, fromStatus, saved.status, requesterUserId);
  }

  return saved;
}

export async function getServiceStatusHistory(
  companyId: string,
  serviceId: string,
  requesterUserId: string,
): Promise<StatusHistoryEntry[]> {
  await requireCompanyRole(companyId, requesterUserId, [CompanyMemberRole.OWNER, CompanyMemberRole.MANAGER]);

  const service = await getServiceRepository().findOne({ where: { id: serviceId, companyId } });
  if (!service) {
    throw new AppError('Service not found', 404);
  }

  return listStatusHistory(AuditEntityType.SERVICE, serviceId);
}
