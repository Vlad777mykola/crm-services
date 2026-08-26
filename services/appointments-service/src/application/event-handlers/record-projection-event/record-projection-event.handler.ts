import type { EntityManager } from 'typeorm';

import type { AppointmentRecommendationRepository } from '../../../db/appointment-recommendation-repository.js';
import type { ProjectionsRepository } from '../../../db/projections-repository.js';
import type {
  AiRecommendationCreatedData,
  CompanyEventData,
  CompanyMemberAddedData,
  CompanyMemberRemovedData,
  ServiceEventData,
  SpecialistServiceEventData,
  UserProfileEventData,
} from './projection-events.js';

export class RecordProjectionEventHandler {
  constructor(
    private readonly projections: ProjectionsRepository,
    private readonly recommendations: AppointmentRecommendationRepository,
  ) {}

  async handle(manager: EntityManager, type: string, data: Record<string, unknown>): Promise<boolean> {
    switch (type) {
      case 'ai.appointment_recommendation_created': {
        const event = data as unknown as AiRecommendationCreatedData;
        await this.recommendations.upsert(manager, {
          id: event.recommendationId,
          appointmentId: event.appointmentId,
          companyId: event.companyId,
          summary: event.summary,
          confidence: event.confidence,
        });
        return true;
      }
      case 'company.created':
      case 'company.updated': {
        const event = data as unknown as CompanyEventData;
        await this.projections.upsertCompany(manager, event.companyId, event.name);
        return true;
      }
      case 'company-member.added': {
        const event = data as unknown as CompanyMemberAddedData;
        await this.projections.upsertMembership(manager, event.companyId, event.userId, event.role);
        return true;
      }
      case 'company-member.removed': {
        const event = data as unknown as CompanyMemberRemovedData;
        await this.projections.removeMembership(manager, event.companyId, event.userId);
        return true;
      }
      case 'service.created':
      case 'service.updated': {
        const event = data as unknown as ServiceEventData;
        await this.projections.upsertService(manager, {
          serviceId: event.serviceId,
          companyId: event.companyId,
          name: event.name,
          status: event.status,
          durationMinutes: event.durationMinutes,
        });
        return true;
      }
      case 'specialist-service.assigned': {
        const event = data as unknown as SpecialistServiceEventData;
        await this.projections.upsertServiceSpecialist(manager, event.serviceId, event.specialistProfileId);
        return true;
      }
      case 'specialist-service.removed': {
        const event = data as unknown as SpecialistServiceEventData;
        await this.projections.removeServiceSpecialist(manager, event.serviceId, event.specialistProfileId);
        return true;
      }
      case 'user.profile_created':
      case 'user.profile_updated': {
        const event = data as unknown as UserProfileEventData;
        await this.projections.upsertClientProfile(manager, {
          userId: event.userId,
          email: event.email,
          name: event.name,
          phone: event.phone,
        });
        return true;
      }
      default:
        return false;
    }
  }
}
