import type { Repository } from 'typeorm';

import { AppError } from '@/common/errors/AppError.js';
import { findActiveCompanyMembership, requireCompanyRole } from '@/common/permissions/companyPermissions.js';
import { AppDataSource } from '@/infrastructure/database/data-source.js';
import { CompanyMemberRole } from '@/modules/company-members/company-member.entity.js';
import { CompanySpecialist, CompanySpecialistStatus } from '@/modules/company-specialists/company-specialist.entity.js';
import { SpecialistProfile } from '@/modules/specialists/specialist-profile.entity.js';

import { ServiceSpecialist } from './service-specialist.entity.js';
import { Service, ServiceStatus } from './service.entity.js';
import type { AssignServiceSpecialistInput } from './service-specialists.schemas.js';

function getServiceSpecialistRepository(): Repository<ServiceSpecialist> {
  return AppDataSource.getRepository(ServiceSpecialist);
}

async function getServiceOrThrow(serviceId: string): Promise<Service> {
  const service = await AppDataSource.getRepository(Service).findOne({ where: { id: serviceId } });
  if (!service) {
    throw new AppError('Service not found', 404);
  }
  return service;
}

async function getMySpecialistProfileOrThrow(userId: string): Promise<SpecialistProfile> {
  const profile = await AppDataSource.getRepository(SpecialistProfile).findOne({ where: { userId } });
  if (!profile) {
    throw new AppError('This user does not have a specialist profile yet', 404);
  }
  return profile;
}

export async function assignServiceSpecialist(
  serviceId: string,
  requesterUserId: string,
  input: AssignServiceSpecialistInput,
): Promise<ServiceSpecialist> {
  const service = await getServiceOrThrow(serviceId);
  await requireCompanyRole(service.companyId, requesterUserId, [CompanyMemberRole.OWNER, CompanyMemberRole.MANAGER]);

  const companySpecialistRepository = AppDataSource.getRepository(CompanySpecialist);
  const activeCompanySpecialist = await companySpecialistRepository.findOne({
    where: {
      companyId: service.companyId,
      specialistProfileId: input.specialistProfileId,
      status: CompanySpecialistStatus.ACTIVE,
    },
    relations: { specialist: true },
  });
  if (!activeCompanySpecialist) {
    throw new AppError('Specialist is not active in this company', 409);
  }

  const repository = getServiceSpecialistRepository();
  const existing = await repository.findOne({
    where: { serviceId, specialistProfileId: input.specialistProfileId },
  });
  if (existing) {
    throw new AppError('Specialist is already assigned to this service', 409);
  }

  const assignment = await repository.save(
    repository.create({
      serviceId,
      companyId: service.companyId,
      specialistProfileId: input.specialistProfileId,
    }),
  );
  assignment.specialist = activeCompanySpecialist.specialist;
  return assignment;
}

export async function listServiceSpecialists(
  serviceId: string,
  requesterUserId: string | undefined,
): Promise<ServiceSpecialist[]> {
  const service = await getServiceOrThrow(serviceId);

  if (service.status !== ServiceStatus.PUBLISHED) {
    // Draft/suspended services follow the same visibility rule as the service itself.
    const membership = requesterUserId ? await findActiveCompanyMembership(service.companyId, requesterUserId) : null;
    if (!membership || ![CompanyMemberRole.OWNER, CompanyMemberRole.MANAGER].includes(membership.role)) {
      throw new AppError('Service not found', 404);
    }
  }

  const repository = getServiceSpecialistRepository();
  return repository.find({
    where: { serviceId },
    relations: { specialist: true },
    order: { createdAt: 'ASC' },
  });
}

export async function unassignServiceSpecialist(
  serviceId: string,
  specialistProfileId: string,
  requesterUserId: string,
): Promise<ServiceSpecialist> {
  const service = await getServiceOrThrow(serviceId);
  await requireCompanyRole(service.companyId, requesterUserId, [CompanyMemberRole.OWNER, CompanyMemberRole.MANAGER]);

  const repository = getServiceSpecialistRepository();
  const assignment = await repository.findOne({ where: { serviceId, specialistProfileId } });
  if (!assignment) {
    throw new AppError('Assignment not found', 404);
  }

  await repository.remove(assignment);
  return assignment;
}

export async function listMySpecialistServices(userId: string): Promise<ServiceSpecialist[]> {
  const profile = await getMySpecialistProfileOrThrow(userId);

  const repository = getServiceSpecialistRepository();
  return repository.find({
    where: { specialistProfileId: profile.id },
    relations: { service: true },
    order: { createdAt: 'DESC' },
  });
}
