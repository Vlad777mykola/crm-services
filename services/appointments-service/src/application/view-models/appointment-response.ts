import type { AppointmentRow } from '../../db/appointment-repository.js';
import type {
  ClientProfileProjectionRow,
  CompanyProjectionRow,
  ServiceProjectionRow,
} from '../../db/projections-repository.js';

export interface AppointmentCompanySummary {
  id: string;
  name: string;
}

export interface AppointmentServiceSummary {
  id: string;
  name: string;
}

export interface AppointmentSpecialistSummary {
  id: string;
  displayName: string;
}

export interface AppointmentClientSummary {
  id: string;
  name: string;
  email: string;
}

export interface AppointmentResponse extends AppointmentRow {
  hasReview: boolean;
  company?: AppointmentCompanySummary;
  service?: AppointmentServiceSummary;
  specialist?: AppointmentSpecialistSummary;
  client?: AppointmentClientSummary;
}

export function toAppointmentResponse(row: AppointmentRow): AppointmentResponse {
  return { ...row, hasReview: false };
}

/** Enrichment lookups, keyed by the ids already present on the row(s) being enriched. */
export interface AppointmentEnrichmentLookups {
  companies?: Map<string, CompanyProjectionRow>;
  services?: Map<string, ServiceProjectionRow>;
  specialists?: Map<string, { userId: string; displayName: string | null }>;
  clients?: Map<string, ClientProfileProjectionRow>;
}

export function enrichAppointmentResponse(
  response: AppointmentResponse,
  lookups: AppointmentEnrichmentLookups,
): AppointmentResponse {
  const company = lookups.companies?.get(response.companyId);
  const service = lookups.services?.get(response.serviceId);
  const specialist = response.specialistProfileId ? lookups.specialists?.get(response.specialistProfileId) : undefined;
  const client = lookups.clients?.get(response.clientUserId);

  return {
    ...response,
    company: company ? { id: company.companyId, name: company.name } : response.company,
    service: service ? { id: service.serviceId, name: service.name } : response.service,
    specialist:
      specialist && response.specialistProfileId
        ? { id: response.specialistProfileId, displayName: specialist.displayName ?? 'Unknown specialist' }
        : response.specialist,
    client: client ? { id: client.userId, name: client.name ?? 'Unknown client', email: client.email ?? '' } : response.client,
  };
}
