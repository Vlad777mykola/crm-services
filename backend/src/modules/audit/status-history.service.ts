import type { EntityManager, Repository } from 'typeorm';

import { AppDataSource } from '@/infrastructure/database/data-source.js';

import { AuditEntityType, StatusHistoryEntry } from './status-history.entity.js';

function getStatusHistoryRepository(manager?: EntityManager): Repository<StatusHistoryEntry> {
  return (manager ?? AppDataSource).getRepository(StatusHistoryEntry);
}

/**
 * Pass `manager` when this call must be part of a larger transaction (e.g.
 * the same transaction that also writes an outbox_events row - see
 * appointments.service.ts) so both commit or roll back together.
 */
export async function recordStatusChange(
  entityType: AuditEntityType,
  entityId: string,
  fromStatus: string | null,
  toStatus: string,
  changedByUserId: string | null,
  reason: string | null = null,
  manager?: EntityManager,
): Promise<StatusHistoryEntry> {
  const repository = getStatusHistoryRepository(manager);
  return repository.save(repository.create({ entityType, entityId, fromStatus, toStatus, changedByUserId, reason }));
}

export async function listStatusHistory(entityType: AuditEntityType, entityId: string): Promise<StatusHistoryEntry[]> {
  const repository = getStatusHistoryRepository();
  return repository.find({ where: { entityType, entityId }, order: { createdAt: 'ASC' } });
}
