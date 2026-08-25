import { AppError } from '../../errors/AppError.js';
import type { CompanyRoleLookup } from '../ports/company-role-lookup.js';
import type { SpecialistProfileLookup, SpecialistProfileRef } from '../ports/specialist-profile-lookup.js';

export async function requireOwnerOrManager(
  companyRoles: CompanyRoleLookup,
  companyId: string,
  userId: string,
): Promise<void> {
  const role = await companyRoles.findActiveMembershipRole(companyId, userId);
  if (role !== 'owner' && role !== 'manager') {
    throw new AppError('You do not have permission to manage this company', 403);
  }
}

export async function getMySpecialistProfileOrThrow(
  specialists: SpecialistProfileLookup,
  userId: string,
): Promise<SpecialistProfileRef> {
  const profile = await specialists.findByUserId(userId);
  if (!profile) {
    throw new AppError('This user does not have a specialist profile yet', 404);
  }
  return profile;
}
