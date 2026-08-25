import type { DataSource } from 'typeorm';

import { findSpecialistProfileIdByUserId } from '../../db/legacy-specialists-bridge.js';
import {
  ServiceRepository,
  type ServiceSpecialistRow,
  type ServiceSpecialistWithSpecialistRow,
} from '../../db/service-repository.js';
import { AppError } from '../../errors/AppError.js';
import { isOwnerOrManager } from '../services/service-catalog-authorization.js';

export class ServiceSpecialistQueries {
  constructor(
    private readonly dataSource: DataSource,
    private readonly repo: ServiceRepository,
  ) {}

  async list(serviceId: string, requesterUserId: string | undefined): Promise<ServiceSpecialistWithSpecialistRow[]> {
    const service = await this.repo.findById(serviceId);
    if (!service) {
      throw new AppError('Service not found', 404);
    }

    if (service.status !== 'published') {
      const canSee = await isOwnerOrManager(this.dataSource, service.companyId, requesterUserId);
      if (!canSee) {
        throw new AppError('Service not found', 404);
      }
    }

    return this.repo.listAssignmentsByServiceWithSpecialist(serviceId);
  }

  async listMine(userId: string): Promise<ServiceSpecialistRow[]> {
    const specialistProfileId = await findSpecialistProfileIdByUserId(this.dataSource, userId);
    if (!specialistProfileId) {
      throw new AppError('This user does not have a specialist profile yet', 404);
    }
    return this.repo.listAssignmentsBySpecialist(specialistProfileId);
  }
}
