import type { EntityManager } from 'typeorm';

import type {
  CompanySpecialistRequestRow,
  CompanySpecialistRow,
} from '../../db/company-specialist-repository.js';

export interface InsertCompanySpecialistRequestInput {
  companyId: string;
  specialistProfileId: string;
  requestedByUserId: string;
  message: string | null;
}

export interface CompanySpecialistReadRepository {
  findActiveRelation(companyId: string, specialistProfileId: string): Promise<CompanySpecialistRow | null>;
  findPendingRequest(companyId: string, specialistProfileId: string): Promise<CompanySpecialistRequestRow | null>;
  findPendingRequestForSpecialist(
    requestId: string,
    specialistProfileId: string,
  ): Promise<CompanySpecialistRequestRow | null>;
  listActiveRelationsByCompany(companyId: string): Promise<CompanySpecialistRow[]>;
  listActiveRelationsBySpecialist(specialistProfileId: string): Promise<CompanySpecialistRow[]>;
  listByCompany(companyId: string): Promise<CompanySpecialistRequestRow[]>;
  listBySpecialist(specialistProfileId: string): Promise<CompanySpecialistRequestRow[]>;
}

export interface CompanySpecialistWriteRepository {
  insertRequest(input: InsertCompanySpecialistRequestInput): Promise<CompanySpecialistRequestRow>;
  markRequestResponded(
    manager: EntityManager,
    requestId: string,
    status: 'accepted' | 'rejected',
  ): Promise<void>;
  upsertActiveRelation(
    manager: EntityManager,
    companyId: string,
    specialistProfileId: string,
  ): Promise<CompanySpecialistRow>;
}
