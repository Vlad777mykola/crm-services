import type { Repository } from 'typeorm';

import { AppDataSource } from '@/infrastructure/database/data-source.js';

import { AuditEntityType, StatusHistoryEntry } from './status-history.entity.js';

function getStatusHistoryRepository(): Repository<StatusHistoryEntry> {
  return AppDataSource.getRepository(StatusHistoryEntry);
}

export async function recordStatusChange(
  entityType: AuditEntityType,
  entityId: string,
  fromStatus: string | null,
  toStatus: string,
  changedByUserId: string | null,
  reason: string | null = null,
): Promise<StatusHistoryEntry> {
  const repository = getStatusHistoryRepository();
  return repository.save(repository.create({ entityType, entityId, fromStatus, toStatus, changedByUserId, reason }));
}

export async function listStatusHistory(entityType: AuditEntityType, entityId: string): Promise<StatusHistoryEntry[]> {
  const repository = getStatusHistoryRepository();
  return repository.find({ where: { entityType, entityId }, order: { createdAt: 'ASC' } });
}
