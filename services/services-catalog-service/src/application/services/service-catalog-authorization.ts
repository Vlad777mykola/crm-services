import type { DataSource } from 'typeorm';

import { findActiveMembershipRole } from '../../db/legacy-company-members-bridge.js';
import { AppError } from '../../errors/AppError.js';

export async function requireOwnerOrManager(dataSource: DataSource, companyId: string, userId: string): Promise<void> {
  const role = await findActiveMembershipRole(dataSource, companyId, userId);
  if (role !== 'owner' && role !== 'manager') {
    throw new AppError('You do not have permission to manage this company', 403);
  }
}

export async function isOwnerOrManager(
  dataSource: DataSource,
  companyId: string,
  userId: string | undefined,
): Promise<boolean> {
  if (!userId) {
    return false;
  }
  const role = await findActiveMembershipRole(dataSource, companyId, userId);
  return role === 'owner' || role === 'manager';
}
