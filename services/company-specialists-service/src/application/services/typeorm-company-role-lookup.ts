import type { DataSource } from 'typeorm';

import { findActiveMembershipRole } from '../../db/legacy-company-members-bridge.js';
import type { CompanyMemberRole, CompanyRoleLookup } from '../ports/company-role-lookup.js';

export class TypeOrmCompanyRoleLookup implements CompanyRoleLookup {
  constructor(private readonly dataSource: DataSource) {}

  findActiveMembershipRole(companyId: string, userId: string): Promise<CompanyMemberRole | undefined> {
    return findActiveMembershipRole(this.dataSource, companyId, userId);
  }
}
