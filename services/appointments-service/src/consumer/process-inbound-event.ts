import type { DataSource } from 'typeorm';

import type { AppointmentRecommendationRepository } from '../db/appointment-recommendation-repository.js';
import type { ProjectionsRepository } from '../db/projections-repository.js';
import {
  handleAiRecommendationCreated,
  handleCompanyEvent,
  handleCompanyMemberAdded,
  handleCompanyMemberRemoved,
  handleServiceEvent,
  handleSpecialistServiceAssigned,
  handleSpecialistServiceRemoved,
  type AiRecommendationCreatedData,
  type CompanyEventData,
  type CompanyMemberAddedData,
  type CompanyMemberRemovedData,
  type ServiceEventData,
  type SpecialistServiceEventData,
} from '../handlers/projection-events.js';
import type { ProcessedEventsRepository } from '../idempotency/processed-events-repository.js';
import { logger } from '../logger.js';

export interface InboundEnvelope {
  id: string;
  type: string;
  data: Record<string, unknown>;
}

export interface ProcessInboundEventDeps {
  dataSource: DataSource;
  processedEvents: ProcessedEventsRepository;
  projections: ProjectionsRepository;
  recommendations: AppointmentRecommendationRepository;
}

export async function processInboundEvent(deps: ProcessInboundEventDeps, envelope: InboundEnvelope): Promise<void> {
  await deps.dataSource.transaction(async (manager) => {
    const isNewEvent = await deps.processedEvents.markProcessed(manager, envelope.id);
    if (!isNewEvent) {
      logger.info({ eventId: envelope.id }, '[appointments-service] already processed - skipping');
      return;
    }

    switch (envelope.type) {
      case 'ai.appointment_recommendation_created':
        await handleAiRecommendationCreated(
          manager,
          envelope.data as unknown as AiRecommendationCreatedData,
          deps.recommendations,
        );
        break;
      case 'company.created':
      case 'company.updated':
        await handleCompanyEvent(envelope.data as unknown as CompanyEventData, deps.projections, manager);
        break;
      case 'company-member.added':
        await handleCompanyMemberAdded(envelope.data as unknown as CompanyMemberAddedData, deps.projections, manager);
        break;
      case 'company-member.removed':
        await handleCompanyMemberRemoved(envelope.data as unknown as CompanyMemberRemovedData, deps.projections, manager);
        break;
      case 'service.created':
      case 'service.updated':
        await handleServiceEvent(envelope.data as unknown as ServiceEventData, deps.projections, manager);
        break;
      case 'specialist-service.assigned':
        await handleSpecialistServiceAssigned(
          envelope.data as unknown as SpecialistServiceEventData,
          deps.projections,
          manager,
        );
        break;
      case 'specialist-service.removed':
        await handleSpecialistServiceRemoved(
          envelope.data as unknown as SpecialistServiceEventData,
          deps.projections,
          manager,
        );
        break;
      default:
        logger.info({ type: envelope.type }, '[appointments-service] no handler for this event type - ignoring');
    }
  });
}
