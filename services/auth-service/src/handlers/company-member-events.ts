import { logger } from '../logger.js';
import type { MembershipProjectionRepository } from '../db/membership-projection-repository.js';

/** Matches contracts/events/company-member.added.v1.json's `data` shape. */
export interface CompanyMemberAddedData {
  companyId: string;
  userId: string;
  role: 'owner' | 'manager';
}

/** Matches contracts/events/company-member.removed.v1.json's `data` shape. */
export interface CompanyMemberRemovedData {
  companyId: string;
  userId: string;
}

export async function handleCompanyMemberAdded(
  data: CompanyMemberAddedData,
  projection: MembershipProjectionRepository,
): Promise<void> {
  await projection.upsert(data.companyId, data.userId, data.role);
  logger.info({ companyId: data.companyId, userId: data.userId }, '[auth-service] membership projection upserted');
}

export async function handleCompanyMemberRemoved(
  data: CompanyMemberRemovedData,
  projection: MembershipProjectionRepository,
): Promise<void> {
  await projection.remove(data.companyId, data.userId);
  logger.info({ companyId: data.companyId, userId: data.userId }, '[auth-service] membership projection row removed');
}
