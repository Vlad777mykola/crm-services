import type { DataSource } from 'typeorm';

import {
  RecordAiCompanyInsightHandler,
} from '../application/event-handlers/record-ai-company-insight/record-ai-company-insight.handler.js';
import type {
  AiCompanyInsightCreatedData,
} from '../application/event-handlers/record-ai-company-insight/record-ai-company-insight.event.js';
import type { CompanyInsightRepository } from '../db/company-insight-repository.js';
import {
  removeMembershipProjection,
  upsertMembershipProjection,
} from '../db/company-membership-projection-repository.js';
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
  insights: CompanyInsightRepository;
}

export async function processInboundEvent(deps: ProcessInboundEventDeps, envelope: InboundEnvelope): Promise<void> {
  await deps.dataSource.transaction(async (manager) => {
    const isNewEvent = await deps.processedEvents.markProcessed(manager, envelope.id);
    if (!isNewEvent) {
      logger.info({ eventId: envelope.id }, '[companies-service] already processed - skipping');
      return;
    }

    if (envelope.type === 'ai.company_insight_created') {
      await new RecordAiCompanyInsightHandler(deps.insights).handle(
        manager,
        envelope.data as unknown as AiCompanyInsightCreatedData,
      );
    } else if (envelope.type === 'company-member.added') {
      const data = envelope.data as unknown as { companyId: string; userId: string; role: 'owner' | 'manager' };
      await upsertMembershipProjection(manager, {
        companyId: data.companyId,
        userId: data.userId,
        role: data.role,
        status: 'active',
      });
    } else if (envelope.type === 'company-member.role_changed') {
      const data = envelope.data as unknown as { companyId: string; userId: string; toRole: 'owner' | 'manager' };
      await upsertMembershipProjection(manager, {
        companyId: data.companyId,
        userId: data.userId,
        role: data.toRole,
        status: 'active',
      });
    } else if (envelope.type === 'company-member.removed') {
      const data = envelope.data as unknown as { companyId: string; userId: string };
      await removeMembershipProjection(manager, data.companyId, data.userId);
    } else {
      logger.info({ type: envelope.type }, '[companies-service] no handler for this event type - ignoring');
    }
  });
}
