import type { EntityManager } from 'typeorm';

import type { AppointmentRecommendationRepository } from '../db/appointment-recommendation-repository.js';
import type { ProjectionsRepository } from '../db/projections-repository.js';

export interface CompanyMemberAddedData {
  companyId: string;
  userId: string;
  role: string;
}

export interface CompanyMemberRemovedData {
  companyId: string;
  userId: string;
}

export interface CompanyEventData {
  companyId: string;
  name: string;
}

export interface ServiceEventData {
  serviceId: string;
  companyId: string;
  name: string;
  status: string;
}

export interface SpecialistServiceEventData {
  serviceId: string;
  specialistProfileId: string;
}

export interface AiRecommendationCreatedData {
  recommendationId: string;
  appointmentId: string;
  companyId: string;
  summary: string;
  confidence: number;
}

export async function handleCompanyMemberAdded(
  data: CompanyMemberAddedData,
  projections: ProjectionsRepository,
  manager: EntityManager,
): Promise<void> {
  await projections.upsertMembership(manager, data.companyId, data.userId, data.role);
}

export async function handleCompanyMemberRemoved(
  data: CompanyMemberRemovedData,
  projections: ProjectionsRepository,
  manager: EntityManager,
): Promise<void> {
  await projections.removeMembership(manager, data.companyId, data.userId);
}

export async function handleCompanyEvent(
  data: CompanyEventData,
  projections: ProjectionsRepository,
  manager: EntityManager,
): Promise<void> {
  await projections.upsertCompany(manager, data.companyId, data.name);
}

export async function handleServiceEvent(
  data: ServiceEventData,
  projections: ProjectionsRepository,
  manager: EntityManager,
): Promise<void> {
  await projections.upsertService(manager, {
    serviceId: data.serviceId,
    companyId: data.companyId,
    name: data.name,
    status: data.status,
  });
}

export async function handleSpecialistServiceAssigned(
  data: SpecialistServiceEventData,
  projections: ProjectionsRepository,
  manager: EntityManager,
): Promise<void> {
  await projections.upsertServiceSpecialist(manager, data.serviceId, data.specialistProfileId);
}

export async function handleSpecialistServiceRemoved(
  data: SpecialistServiceEventData,
  projections: ProjectionsRepository,
  manager: EntityManager,
): Promise<void> {
  await projections.removeServiceSpecialist(manager, data.serviceId, data.specialistProfileId);
}

/**
 * Mirrors contracts/events/ai.appointment_recommendation_created.v1.json.
 * Moved from backend-projection-service in Phase 12 - not part of the
 * transactional projection-events manager above.
 */
export async function handleAiRecommendationCreated(
  manager: EntityManager,
  data: AiRecommendationCreatedData,
  repository: AppointmentRecommendationRepository,
): Promise<void> {
  await repository.upsert(manager, {
    id: data.recommendationId,
    appointmentId: data.appointmentId,
    companyId: data.companyId,
    summary: data.summary,
    confidence: data.confidence,
  });
}
