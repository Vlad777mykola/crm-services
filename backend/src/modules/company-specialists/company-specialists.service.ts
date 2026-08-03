import type { Repository } from 'typeorm';

import { AppError } from '@/common/errors/AppError.js';
import { requireCompanyRole } from '@/common/permissions/companyPermissions.js';
import { AppDataSource } from '@/infrastructure/database/data-source.js';
import { CompanyMemberRole } from '@/modules/company-members/company-member.entity.js';
import { SpecialistProfile } from '@/modules/specialists/specialist-profile.entity.js';

import { CompanySpecialist, CompanySpecialistStatus } from './company-specialist.entity.js';
import { CompanySpecialistRequest, CompanySpecialistRequestStatus } from './company-specialist-request.entity.js';
import type { SendSpecialistRequestInput } from './company-specialists.schemas.js';

function getRequestRepository(): Repository<CompanySpecialistRequest> {
  return AppDataSource.getRepository(CompanySpecialistRequest);
}

function getRelationRepository(): Repository<CompanySpecialist> {
  return AppDataSource.getRepository(CompanySpecialist);
}

async function getMySpecialistProfileOrThrow(userId: string): Promise<SpecialistProfile> {
  const repository = AppDataSource.getRepository(SpecialistProfile);
  const profile = await repository.findOne({ where: { userId } });
  if (!profile) {
    throw new AppError('This user does not have a specialist profile yet', 404);
  }
  return profile;
}

export async function sendSpecialistRequest(
  companyId: string,
  requesterUserId: string,
  input: SendSpecialistRequestInput,
): Promise<CompanySpecialistRequest> {
  await requireCompanyRole(companyId, requesterUserId, [CompanyMemberRole.OWNER, CompanyMemberRole.MANAGER]);

  const specialistRepository = AppDataSource.getRepository(SpecialistProfile);
  const specialist = await specialistRepository.findOne({ where: { id: input.specialistProfileId } });
  if (!specialist) {
    throw new AppError('Specialist profile not found', 404);
  }

  const relationRepository = getRelationRepository();
  const activeRelation = await relationRepository.findOne({
    where: { companyId, specialistProfileId: specialist.id, status: CompanySpecialistStatus.ACTIVE },
  });
  if (activeRelation) {
    throw new AppError('This specialist is already active in your company', 409);
  }

  const requestRepository = getRequestRepository();
  const pendingRequest = await requestRepository.findOne({
    where: { companyId, specialistProfileId: specialist.id, status: CompanySpecialistRequestStatus.PENDING },
  });
  if (pendingRequest) {
    throw new AppError('A pending request already exists for this specialist', 409);
  }

  const request = await requestRepository.save(
    requestRepository.create({
      companyId,
      specialistProfileId: specialist.id,
      requestedByUserId: requesterUserId,
      status: CompanySpecialistRequestStatus.PENDING,
      message: input.message ?? null,
    }),
  );
  request.specialist = specialist;
  return request;
}

export async function listCompanySpecialistRequests(
  companyId: string,
  requesterUserId: string,
): Promise<CompanySpecialistRequest[]> {
  await requireCompanyRole(companyId, requesterUserId, [CompanyMemberRole.OWNER, CompanyMemberRole.MANAGER]);

  const repository = getRequestRepository();
  return repository.find({
    where: { companyId },
    relations: { specialist: true },
    order: { createdAt: 'DESC' },
  });
}

export async function listCompanySpecialists(companyId: string): Promise<CompanySpecialist[]> {
  const repository = getRelationRepository();
  return repository.find({
    where: { companyId, status: CompanySpecialistStatus.ACTIVE },
    relations: { specialist: true },
    order: { startedAt: 'DESC' },
  });
}

export async function listMySpecialistCompanyRequests(userId: string): Promise<CompanySpecialistRequest[]> {
  const profile = await getMySpecialistProfileOrThrow(userId);

  const repository = getRequestRepository();
  return repository.find({
    where: { specialistProfileId: profile.id },
    relations: { company: true },
    order: { createdAt: 'DESC' },
  });
}

export async function listMySpecialistCompanies(userId: string): Promise<CompanySpecialist[]> {
  const profile = await getMySpecialistProfileOrThrow(userId);

  const repository = getRelationRepository();
  return repository.find({
    where: { specialistProfileId: profile.id, status: CompanySpecialistStatus.ACTIVE },
    relations: { company: true },
    order: { startedAt: 'DESC' },
  });
}

async function getPendingRequestForSpecialistOrThrow(
  requestId: string,
  specialistProfileId: string,
): Promise<CompanySpecialistRequest> {
  const repository = getRequestRepository();
  const request = await repository.findOne({ where: { id: requestId, specialistProfileId }, relations: { company: true } });

  if (!request) {
    throw new AppError('Request not found', 404);
  }

  if (request.status !== CompanySpecialistRequestStatus.PENDING) {
    throw new AppError('This request has already been responded to', 409);
  }

  return request;
}

export async function acceptSpecialistCompanyRequest(
  requestId: string,
  userId: string,
): Promise<CompanySpecialistRequest> {
  const profile = await getMySpecialistProfileOrThrow(userId);
  const request = await getPendingRequestForSpecialistOrThrow(requestId, profile.id);

  request.status = CompanySpecialistRequestStatus.ACCEPTED;
  request.respondedAt = new Date();
  await getRequestRepository().save(request);

  const relationRepository = getRelationRepository();
  const existingRelation = await relationRepository.findOne({
    where: { companyId: request.companyId, specialistProfileId: profile.id },
  });

  if (existingRelation) {
    existingRelation.status = CompanySpecialistStatus.ACTIVE;
    existingRelation.startedAt = new Date();
    existingRelation.endedAt = null;
    await relationRepository.save(existingRelation);
  } else {
    await relationRepository.save(
      relationRepository.create({
        companyId: request.companyId,
        specialistProfileId: profile.id,
        status: CompanySpecialistStatus.ACTIVE,
        startedAt: new Date(),
        endedAt: null,
      }),
    );
  }

  return request;
}

export async function rejectSpecialistCompanyRequest(
  requestId: string,
  userId: string,
): Promise<CompanySpecialistRequest> {
  const profile = await getMySpecialistProfileOrThrow(userId);
  const request = await getPendingRequestForSpecialistOrThrow(requestId, profile.id);

  request.status = CompanySpecialistRequestStatus.REJECTED;
  request.respondedAt = new Date();
  return getRequestRepository().save(request);
}
