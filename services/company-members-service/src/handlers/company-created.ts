import type { PoolClient } from 'pg';

import { logger } from '../logger.js';
import { MemberRepository } from '../db/member-repository.js';
import { recordOutboxEvent } from '../outbox/outbox-repository.js';

/** Matches contracts/events/company.created.v1.json's `data` shape. */
export interface CompanyCreatedData {
  companyId: string;
  name: string;
  slug: string;
  createdByUserId: string;
}

/**
 * Auto-creates the `owner` row for a newly created company - this is the
 * event-driven replacement for what used to be an in-process transaction in
 * companies-service (see companies-service/src/db/legacy-company-members-bridge.ts,
 * removed for this exact reason). `ON CONFLICT DO NOTHING` (inside
 * `MemberRepository.insertOwner`) plus the outer `processed_events` check
 * make this safe against redelivery.
 */
export async function handleCompanyCreated(
  data: CompanyCreatedData,
  members: MemberRepository,
  client: PoolClient,
): Promise<void> {
  const row = await members.insertOwner(client, data.companyId, data.createdByUserId);
  if (!row) {
    logger.info({ companyId: data.companyId }, '[company-members-service] owner row already exists - skipping');
    return;
  }

  await recordOutboxEvent(client, {
    type: 'company-member.added',
    aggregateId: row.id,
    payload: { companyId: data.companyId, userId: data.createdByUserId, role: 'owner' },
  });
}
