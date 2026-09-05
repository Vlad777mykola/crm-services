import {
  isSpecialistOwner as authzIsSpecialistOwner,
  requireCompanyRole,
  requireSpecialistOwnerOrCompanyRole,
  type CompanyRole,
  type MembershipLookup,
  type SpecialistOwnerLookup,
} from '@crm/authz-kit';

import { ProjectionsRepository } from '../../db/projections-repository.js';

const MANAGING_ROLES: readonly CompanyRole[] = ['owner', 'manager'];

function toMembershipLookup(projections: ProjectionsRepository): MembershipLookup {
  return {
    async findMembership(companyId, userId) {
      const role = await projections.findMembershipRole(companyId, userId);
      return role ? { role: role as CompanyRole } : null;
    },
  };
}

function toSpecialistOwnerLookup(projections: ProjectionsRepository): SpecialistOwnerLookup {
  return {
    findSpecialistOwnerUserId: (specialistProfileId) => projections.findSpecialistOwnerUserId(specialistProfileId),
  };
}

export async function requireManagingRole(
  projections: ProjectionsRepository,
  companyId: string,
  userId: string,
): Promise<void> {
  await requireCompanyRole(toMembershipLookup(projections), companyId, userId, MANAGING_ROLES);
}

/** True if `userId` is the specialist behind `specialistProfileId` (self-service access). */
export async function isSpecialistOwner(
  projections: ProjectionsRepository,
  specialistProfileId: string,
  userId: string,
): Promise<boolean> {
  return authzIsSpecialistOwner(toSpecialistOwnerLookup(projections), specialistProfileId, userId);
}

/**
 * Access rule used for both "view my appointments" and "manage my
 * availability": the specialist themself, or a manager/owner of the company
 * they're scoped to. Not manager-only - a specialist must never need a
 * company role just to see or manage their own schedule.
 */
export async function requireSpecialistOwnerOrManagingRole(
  projections: ProjectionsRepository,
  companyId: string,
  specialistProfileId: string,
  userId: string,
): Promise<void> {
  await requireSpecialistOwnerOrCompanyRole(
    { membership: toMembershipLookup(projections), specialistOwner: toSpecialistOwnerLookup(projections) },
    companyId,
    specialistProfileId,
    userId,
    MANAGING_ROLES,
  );
}
