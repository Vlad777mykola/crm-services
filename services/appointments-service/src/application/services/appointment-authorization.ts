import { ProjectionsRepository } from '../../db/projections-repository.js';
import { AppError } from '../../errors/AppError.js';

const MANAGING_ROLES = new Set(['owner', 'manager']);

export async function requireManagingRole(
  projections: ProjectionsRepository,
  companyId: string,
  userId: string,
): Promise<void> {
  const role = await projections.findMembershipRole(companyId, userId);
  if (!role || !MANAGING_ROLES.has(role)) {
    throw new AppError('You do not have permission to manage this company', 403);
  }
}
