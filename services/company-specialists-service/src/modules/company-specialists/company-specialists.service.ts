import type { DataSource } from 'typeorm';

import { AppError } from '../../errors/AppError.js';
import {
  CompanySpecialistRepository,
  type CompanySpecialistRequestRow,
  type CompanySpecialistRow,
} from '../../db/company-specialist-repository.js';
import { findActiveMembershipRole } from '../../db/legacy-company-members-bridge.js';
import { findSpecialistProfileById, findSpecialistProfileByUserId } from '../../db/legacy-specialists-bridge.js';
import { recordOutboxEvent } from '../../outbox/outbox-repository.js';
import type { SendSpecialistRequestInput } from './company-specialists.schemas.js';

export class CompanySpecialistsService {
  private readonly repo: CompanySpecialistRepository;

  constructor(private readonly dataSource: DataSource) {
    this.repo = new CompanySpecialistRepository(dataSource);
  }

  private async requireOwnerOrManager(companyId: string, userId: string): Promise<void> {
    const role = await findActiveMembershipRole(this.dataSource, companyId, userId);
    if (role !== 'owner' && role !== 'manager') {
      throw new AppError('You do not have permission to manage this company', 403);
    }
  }

  private async getMySpecialistProfileOrThrow(userId: string): Promise<{ id: string; userId: string }> {
    const profile = await findSpecialistProfileByUserId(this.dataSource, userId);
    if (!profile) {
      throw new AppError('This user does not have a specialist profile yet', 404);
    }
    return profile;
  }

  async sendSpecialistRequest(
    companyId: string,
    requesterUserId: string,
    input: SendSpecialistRequestInput,
  ): Promise<CompanySpecialistRequestRow> {
    await this.requireOwnerOrManager(companyId, requesterUserId);

    const specialist = await findSpecialistProfileById(this.dataSource, input.specialistProfileId);
    if (!specialist) {
      throw new AppError('Specialist profile not found', 404);
    }

    const activeRelation = await this.repo.findActiveRelation(companyId, specialist.id);
    if (activeRelation) {
      throw new AppError('This specialist is already active in your company', 409);
    }

    const pendingRequest = await this.repo.findPendingRequest(companyId, specialist.id);
    if (pendingRequest) {
      throw new AppError('A pending request already exists for this specialist', 409);
    }

    return this.repo.insertRequest({
      companyId,
      specialistProfileId: specialist.id,
      requestedByUserId: requesterUserId,
      message: input.message ?? null,
    });
  }

  async listCompanySpecialistRequests(companyId: string, requesterUserId: string): Promise<CompanySpecialistRequestRow[]> {
    await this.requireOwnerOrManager(companyId, requesterUserId);
    return this.repo.listByCompany(companyId);
  }

  async listCompanySpecialists(companyId: string): Promise<CompanySpecialistRow[]> {
    return this.repo.listActiveRelationsByCompany(companyId);
  }

  async listMySpecialistCompanyRequests(userId: string): Promise<CompanySpecialistRequestRow[]> {
    const profile = await this.getMySpecialistProfileOrThrow(userId);
    return this.repo.listBySpecialist(profile.id);
  }

  async listMySpecialistCompanies(userId: string): Promise<CompanySpecialistRow[]> {
    const profile = await this.getMySpecialistProfileOrThrow(userId);
    return this.repo.listActiveRelationsBySpecialist(profile.id);
  }

  private async getPendingRequestForSpecialistOrThrow(
    requestId: string,
    specialistProfileId: string,
  ): Promise<CompanySpecialistRequestRow> {
    const request = await this.repo.findPendingRequestForSpecialist(requestId, specialistProfileId);
    if (!request) {
      throw new AppError('Request not found', 404);
    }
    if (request.status !== 'pending') {
      throw new AppError('This request has already been responded to', 409);
    }
    return request;
  }

  async acceptSpecialistCompanyRequest(requestId: string, userId: string): Promise<CompanySpecialistRequestRow> {
    const profile = await this.getMySpecialistProfileOrThrow(userId);
    const request = await this.getPendingRequestForSpecialistOrThrow(requestId, profile.id);

    await this.dataSource.transaction(async (manager) => {
      await this.repo.markRequestResponded(manager, requestId, 'accepted');
      const relation = await this.repo.upsertActiveRelation(manager, request.companyId, profile.id);
      await recordOutboxEvent(manager, {
        type: 'company-specialist.accepted',
        aggregateId: relation.id,
        payload: { companyId: request.companyId, specialistProfileId: profile.id },
      });
    });

    return { ...request, status: 'accepted', respondedAt: new Date() };
  }

  async rejectSpecialistCompanyRequest(requestId: string, userId: string): Promise<CompanySpecialistRequestRow> {
    const profile = await this.getMySpecialistProfileOrThrow(userId);
    const request = await this.getPendingRequestForSpecialistOrThrow(requestId, profile.id);

    await this.dataSource.transaction(async (manager) => {
      await this.repo.markRequestResponded(manager, requestId, 'rejected');
    });

    return { ...request, status: 'rejected', respondedAt: new Date() };
  }
}
