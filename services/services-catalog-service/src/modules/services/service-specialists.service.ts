import type { Pool } from 'pg';

import { AppError } from '../../errors/AppError.js';
import { ServiceRepository, type ServiceSpecialistRow } from '../../db/service-repository.js';
import { findActiveMembershipRole } from '../../db/legacy-company-members-bridge.js';
import { isActiveCompanySpecialist } from '../../db/legacy-company-specialists-bridge.js';
import { findSpecialistProfileIdByUserId } from '../../db/legacy-specialists-bridge.js';
import { recordOutboxEvent } from '../../outbox/outbox-repository.js';
import type { AssignServiceSpecialistInput } from './service-specialists.schemas.js';

export class ServiceSpecialistsService {
  private readonly repo: ServiceRepository;

  constructor(private readonly pool: Pool) {
    this.repo = new ServiceRepository(pool);
  }

  private async requireOwnerOrManager(companyId: string, userId: string): Promise<void> {
    const role = await findActiveMembershipRole(this.pool, companyId, userId);
    if (role !== 'owner' && role !== 'manager') {
      throw new AppError('You do not have permission to manage this company', 403);
    }
  }

  private async getServiceOrThrow(serviceId: string) {
    const service = await this.repo.findById(serviceId);
    if (!service) throw new AppError('Service not found', 404);
    return service;
  }

  async assign(
    serviceId: string,
    requesterUserId: string,
    input: AssignServiceSpecialistInput,
  ): Promise<ServiceSpecialistRow> {
    const service = await this.getServiceOrThrow(serviceId);
    await this.requireOwnerOrManager(service.companyId, requesterUserId);

    const isActive = await isActiveCompanySpecialist(this.pool, service.companyId, input.specialistProfileId);
    if (!isActive) {
      throw new AppError('Specialist is not active in this company', 409);
    }

    const existing = await this.repo.findAssignment(serviceId, input.specialistProfileId);
    if (existing) {
      throw new AppError('Specialist is already assigned to this service', 409);
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const assignment = await this.repo.insertAssignment(client, {
        serviceId,
        companyId: service.companyId,
        specialistProfileId: input.specialistProfileId,
      });

      await recordOutboxEvent(client, {
        type: 'specialist-service.assigned',
        aggregateId: assignment.id,
        payload: { serviceId, companyId: service.companyId, specialistProfileId: input.specialistProfileId },
      });

      await client.query('COMMIT');
      return assignment;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async list(serviceId: string, requesterUserId: string | undefined): Promise<ServiceSpecialistRow[]> {
    const service = await this.getServiceOrThrow(serviceId);

    if (service.status !== 'published') {
      // Draft/suspended services follow the same visibility rule as the service itself.
      const role = requesterUserId
        ? await findActiveMembershipRole(this.pool, service.companyId, requesterUserId)
        : undefined;
      if (role !== 'owner' && role !== 'manager') {
        throw new AppError('Service not found', 404);
      }
    }

    return this.repo.listAssignmentsByService(serviceId);
  }

  async unassign(serviceId: string, specialistProfileId: string, requesterUserId: string): Promise<ServiceSpecialistRow> {
    const service = await this.getServiceOrThrow(serviceId);
    await this.requireOwnerOrManager(service.companyId, requesterUserId);

    const assignment = await this.repo.findAssignment(serviceId, specialistProfileId);
    if (!assignment) throw new AppError('Assignment not found', 404);

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await this.repo.removeAssignment(client, serviceId, specialistProfileId);

      await recordOutboxEvent(client, {
        type: 'specialist-service.removed',
        aggregateId: assignment.id,
        payload: { serviceId, companyId: service.companyId, specialistProfileId },
      });

      await client.query('COMMIT');
      return assignment;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async listMine(userId: string): Promise<ServiceSpecialistRow[]> {
    const specialistProfileId = await findSpecialistProfileIdByUserId(this.pool, userId);
    if (!specialistProfileId) {
      throw new AppError('This user does not have a specialist profile yet', 404);
    }
    return this.repo.listAssignmentsBySpecialist(specialistProfileId);
  }
}
