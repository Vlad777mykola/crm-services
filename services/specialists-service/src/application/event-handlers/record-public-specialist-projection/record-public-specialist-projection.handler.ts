import type { EntityManager } from 'typeorm';

import type { PublicSpecialistProjectionRepository } from '../../../db/public-specialist-projection-repository.js';
import type {
  CompanyCreatedData,
  CompanySpecialistData,
  CompanyUpdatedData,
  ReviewReceivedData,
  ServiceData,
  SpecialistServiceData,
} from './public-specialist-projection-events.js';

export class RecordPublicSpecialistProjectionHandler {
  constructor(private readonly projections: PublicSpecialistProjectionRepository) {}

  async handle(manager: EntityManager, type: string, data: Record<string, unknown>): Promise<boolean> {
    switch (type) {
      case 'company.created': {
        const event = data as unknown as CompanyCreatedData;
        await this.projections.upsertCompany(manager, {
          companyId: event.companyId,
          name: event.name,
          slug: event.slug,
          status: 'draft',
        });
        return true;
      }
      case 'company.updated': {
        const event = data as unknown as CompanyUpdatedData;
        await this.projections.upsertCompany(manager, {
          companyId: event.companyId,
          name: event.name,
          status: event.status,
        });
        return true;
      }
      case 'company-specialist.accepted': {
        const event = data as unknown as CompanySpecialistData;
        await this.projections.addCompanySpecialist(manager, event.companyId, event.specialistProfileId);
        return true;
      }
      case 'company-specialist.removed': {
        const event = data as unknown as CompanySpecialistData;
        await this.projections.removeCompanySpecialist(manager, event.companyId, event.specialistProfileId);
        return true;
      }
      case 'service.created':
      case 'service.updated': {
        const event = data as unknown as ServiceData;
        await this.projections.upsertService(manager, {
          serviceId: event.serviceId,
          companyId: event.companyId,
          name: event.name,
          status: event.status,
        });
        return true;
      }
      case 'specialist-service.assigned': {
        const event = data as unknown as SpecialistServiceData;
        await this.projections.addServiceSpecialist(manager, {
          serviceId: event.serviceId,
          companyId: event.companyId,
          specialistProfileId: event.specialistProfileId,
        });
        return true;
      }
      case 'specialist-service.removed': {
        const event = data as unknown as SpecialistServiceData;
        await this.projections.removeServiceSpecialist(manager, event.serviceId, event.specialistProfileId);
        return true;
      }
      case 'review.received': {
        const event = data as unknown as ReviewReceivedData;
        if (event.specialistProfileId) {
          await this.projections.recordReview(manager, event.specialistProfileId, event.rating);
        }
        return true;
      }
      default:
        return false;
    }
  }
}
