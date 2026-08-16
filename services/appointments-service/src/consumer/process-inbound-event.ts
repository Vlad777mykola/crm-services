import type { Pool } from 'pg';

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
  pool: Pool;
  processedEvents: ProcessedEventsRepository;
  projections: ProjectionsRepository;
  recommendations: AppointmentRecommendationRepository;
}

export async function processInboundEvent(deps: ProcessInboundEventDeps, envelope: InboundEnvelope): Promise<void> {
  const client = await deps.pool.connect();
  try {
    await client.query('BEGIN');

    const isNewEvent = await deps.processedEvents.markProcessed(client, envelope.id);
    if (!isNewEvent) {
      await client.query('COMMIT');
      logger.info({ eventId: envelope.id }, '[appointments-service] already processed - skipping');
      return;
    }

    switch (envelope.type) {
      case 'ai.appointment_recommendation_created':
        await handleAiRecommendationCreated(
          client,
          envelope.data as unknown as AiRecommendationCreatedData,
          deps.recommendations,
        );
        break;
      case 'company.created':
      case 'company.updated':
        await handleCompanyEvent(envelope.data as unknown as CompanyEventData, deps.projections, client);
        break;
      case 'company-member.added':
        await handleCompanyMemberAdded(envelope.data as unknown as CompanyMemberAddedData, deps.projections, client);
        break;
      case 'company-member.removed':
        await handleCompanyMemberRemoved(envelope.data as unknown as CompanyMemberRemovedData, deps.projections, client);
        break;
      case 'service.created':
      case 'service.updated':
        await handleServiceEvent(envelope.data as unknown as ServiceEventData, deps.projections, client);
        break;
      case 'specialist-service.assigned':
        await handleSpecialistServiceAssigned(
          envelope.data as unknown as SpecialistServiceEventData,
          deps.projections,
          client,
        );
        break;
      case 'specialist-service.removed':
        await handleSpecialistServiceRemoved(
          envelope.data as unknown as SpecialistServiceEventData,
          deps.projections,
          client,
        );
        break;
      default:
        logger.info({ type: envelope.type }, '[appointments-service] no handler for this event type - ignoring');
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
