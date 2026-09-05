export type CompanyRole = 'owner' | 'manager';

export interface CompanyMembership {
  role: CompanyRole;
}

/**
 * Every service that needs a company-role check implements this against its
 * own local membership projection (or, for company-members-service, its own
 * table). authz-kit never touches a database directly.
 */
export interface MembershipLookup {
  findMembership(companyId: string, userId: string): Promise<CompanyMembership | null>;
}

/**
 * Every service that needs a "does this user own this specialist profile"
 * check implements this against its own local specialist-owner projection.
 */
export interface SpecialistOwnerLookup {
  findSpecialistOwnerUserId(specialistProfileId: string): Promise<string | null | undefined>;
}
