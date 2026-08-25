import type { DataSource } from 'typeorm';

import { findActiveMembershipRole, listActiveCompanyIdsForUser } from '../../db/legacy-company-members-bridge.js';
import { AppError } from '../../errors/AppError.js';

export async function requireOwnerOrManager(dataSource: DataSource, companyId: string, userId: string): Promise<void> {
  const role = await findActiveMembershipRole(dataSource, companyId, userId);
  if (!role || !['owner', 'manager'].includes(role)) {
    throw new AppError('You do not have permission to manage this company', 403);
  }
}

export async function canSeePrivateCompany(
  dataSource: DataSource,
  companyId: string,
  userId: string | undefined,
): Promise<boolean> {
  if (!userId) {
    return false;
  }
  return Boolean(await findActiveMembershipRole(dataSource, companyId, userId));
}

export { listActiveCompanyIdsForUser };
