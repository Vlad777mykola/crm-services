import type { EntityManager } from 'typeorm';

import type {
  SpecialistProfileRow,
  SpecialistStatus,
  StatusHistoryRow,
} from '../../db/specialist-repository.js';

export interface InsertSpecialistProfileInput {
  userId: string;
  displayName: string;
  headline: string | null;
  bio: string | null;
  category: string | null;
  city: string | null;
  isRemoteSupported: boolean;
}

export interface UpdateSpecialistProfilePatch {
  displayName?: string;
  headline?: string | null;
  bio?: string | null;
  category?: string | null;
  city?: string | null;
  isRemoteSupported?: boolean;
  status?: SpecialistStatus;
}

export interface InsertStatusHistoryInput {
  specialistProfileId: string;
  fromStatus: string | null;
  toStatus: string;
  changedByUserId: string | null;
}

export interface ListPublicSpecialistsFilters {
  q?: string;
  category?: string;
  city?: string;
  remoteOnly?: boolean;
  skip: number;
  take: number;
}

export interface SpecialistReadRepository {
  findByUserId(userId: string): Promise<SpecialistProfileRow | null>;
  findByUserIdWithManager(manager: EntityManager, userId: string): Promise<SpecialistProfileRow | null>;
  findById(specialistId: string): Promise<SpecialistProfileRow | null>;
  listPublic(filters: ListPublicSpecialistsFilters): Promise<{ items: SpecialistProfileRow[]; total: number }>;
  listStatusHistory(specialistProfileId: string): Promise<StatusHistoryRow[]>;
}

export interface SpecialistWriteRepository {
  insert(manager: EntityManager, input: InsertSpecialistProfileInput): Promise<SpecialistProfileRow>;
  update(
    manager: EntityManager,
    userId: string,
    patch: UpdateSpecialistProfilePatch,
  ): Promise<SpecialistProfileRow>;
  insertStatusHistory(manager: EntityManager, input: InsertStatusHistoryInput): Promise<void>;
}
