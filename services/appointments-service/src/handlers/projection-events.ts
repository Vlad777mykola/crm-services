import type { PoolClient } from 'pg';

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
  client: PoolClient,
): Promise<void> {
  await projections.upsertMembership(client, data.companyId, data.userId, data.role);
}

export async function handleCompanyMemberRemoved(
  data: CompanyMemberRemovedData,
  projections: ProjectionsRepository,
  client: PoolClient,
): Promise<void> {
  await projections.removeMembership(client, data.companyId, data.userId);
}

export async function handleCompanyEvent(
  data: CompanyEventData,
  projections: ProjectionsRepository,
  client: PoolClient,
): Promise<void> {
  await projections.upsertCompany(client, data.companyId, data.name);
}

export async function handleServiceEvent(
  data: ServiceEventData,
  projections: ProjectionsRepository,
  client: PoolClient,
): Promise<void> {
  await projections.upsertService(client, {
    serviceId: data.serviceId,
    companyId: data.companyId,
    name: data.name,
    status: data.status,
  });
}

export async function handleSpecialistServiceAssigned(
  data: SpecialistServiceEventData,
  projections: ProjectionsRepository,
  client: PoolClient,
): Promise<void> {
  await projections.upsertServiceSpecialist(client, data.serviceId, data.specialistProfileId);
}

export async function handleSpecialistServiceRemoved(
  data: SpecialistServiceEventData,
  projections: ProjectionsRepository,
  client: PoolClient,
): Promise<void> {
  await projections.removeServiceSpecialist(client, data.serviceId, data.specialistProfileId);
}

/**
 * Mirrors contracts/events/ai.appointment_recommendation_created.v1.json.
 * Moved from backend-projection-service in Phase 12 - not part of the
 * transactional projection-events client/transaction above because it's
 * unrelated to appointment writes; called directly with the pool.
 */
export async function handleAiRecommendationCreated(
  data: AiRecommendationCreatedData,
  repository: AppointmentRecommendationRepository,
): Promise<void> {
  await repository.upsert({
    id: data.recommendationId,
    appointmentId: data.appointmentId,
    companyId: data.companyId,
    summary: data.summary,
    confidence: data.confidence,
  });
}
