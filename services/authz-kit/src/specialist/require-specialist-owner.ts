import { AppError } from '@crm/http-kit';

import type { SpecialistOwnerLookup } from '../types.js';

export async function isSpecialistOwner(
  lookup: SpecialistOwnerLookup,
  specialistProfileId: string,
  userId: string,
): Promise<boolean> {
  const ownerUserId = await lookup.findSpecialistOwnerUserId(specialistProfileId);
  return ownerUserId === userId;
}

export async function requireSpecialistOwner(
  lookup: SpecialistOwnerLookup,
  specialistProfileId: string,
  userId: string,
): Promise<void> {
  if (!(await isSpecialistOwner(lookup, specialistProfileId, userId))) {
    throw new AppError('You do not have permission to manage this specialist profile', 403);
  }
}
