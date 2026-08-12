import type { Pool } from 'pg';

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

  constructor(private readonly pool: Pool) {
    this.repo = new CompanySpecialistRepository(pool);
  }

  private async requireOwnerOrManager(companyId: string, userId: string): Promise<void> {
    const role = await findActiveMembershipRole(this.pool, companyId, userId);
    if (role !== 'owner' && role !== 'manager') {
      throw new AppError('You do not have permission to manage this company', 403);
    }
  }

  private async getMySpecialistProfileOrThrow(userId: string): Promise<{ id: string; userId: string }> {
    const profile = await findSpecialistProfileByUserId(this.pool, userId);
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

    const specialist = await findSpecialistProfileById(this.pool, input.specialistProfileId);
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

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await this.repo.markRequestResponded(client, requestId, 'accepted');
      const relation = await this.repo.upsertActiveRelation(client, request.companyId, profile.id);
      await recordOutboxEvent(client, {
        type: 'company-specialist.accepted',
        aggregateId: relation.id,
        payload: { companyId: request.companyId, specialistProfileId: profile.id },
      });
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    return { ...request, status: 'accepted', respondedAt: new Date() };
  }

  async rejectSpecialistCompanyRequest(requestId: string, userId: string): Promise<CompanySpecialistRequestRow> {
    const profile = await this.getMySpecialistProfileOrThrow(userId);
    const request = await this.getPendingRequestForSpecialistOrThrow(requestId, profile.id);

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await this.repo.markRequestResponded(client, requestId, 'rejected');
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    return { ...request, status: 'rejected', respondedAt: new Date() };
  }
}
