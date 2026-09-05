import {
  ProjectionsRepository,
  type ClientProfileProjectionRow,
  type CompanyProjectionRow,
  type ServiceProjectionRow,
} from '../../../db/projections-repository.js';
import type { ListAppointmentsQueryInput } from '../../../modules/appointments/appointments.schemas.js';
import {
  enrichAppointmentResponse,
  type AppointmentResponse,
} from '../../view-models/appointment-response.js';

function isPresent<T>(value: T | null): value is T {
  return value !== null;
}

export function toFilters(input: ListAppointmentsQueryInput = {}) {
  return {
    from: input.from ? new Date(input.from) : undefined,
    to: input.to ? new Date(input.to) : undefined,
    status: input.status,
    serviceId: input.serviceId,
    specialistProfileId: input.specialistProfileId,
    limit: input.limit,
  };
}

/**
 * Persona list/detail views embed denormalized company/service/specialist/
 * client summaries so the frontend doesn't need follow-up round trips per
 * appointment. One lookup per *unique* id referenced by the batch, not per
 * row - projections are local reads (no cross-schema SQL, no network call).
 */
export async function enrichAppointments(
  projections: ProjectionsRepository,
  responses: AppointmentResponse[],
): Promise<AppointmentResponse[]> {
  if (responses.length === 0) return responses;

  const companyIds = new Set(responses.map((r) => r.companyId));
  const serviceIds = new Set(responses.map((r) => r.serviceId));
  const specialistIds = new Set(responses.map((r) => r.specialistProfileId).filter((id): id is string => !!id));
  const clientIds = new Set(responses.map((r) => r.clientUserId));

  const [companies, services, specialists, clients] = await Promise.all([
    Promise.all([...companyIds].map((id) => projections.findCompany(id))),
    Promise.all([...serviceIds].map((id) => projections.findService(id))),
    Promise.all([...specialistIds].map((id) => projections.findSpecialistSummary(id))),
    Promise.all([...clientIds].map((id) => projections.findClientProfile(id))),
  ]);

  const lookups = {
    companies: new Map<string, CompanyProjectionRow>(companies.filter(isPresent).map((c) => [c.companyId, c])),
    services: new Map<string, ServiceProjectionRow>(services.filter(isPresent).map((s) => [s.serviceId, s])),
    specialists: new Map<string, { userId: string; displayName: string | null }>(
      [...specialistIds]
        .map((id, idx) => [id, specialists[idx]] as const)
        .filter((entry): entry is [string, { userId: string; displayName: string | null }] => entry[1] !== null),
    ),
    clients: new Map<string, ClientProfileProjectionRow>(clients.filter(isPresent).map((c) => [c.userId, c])),
  };

  return responses.map((response) => enrichAppointmentResponse(response, lookups));
}
