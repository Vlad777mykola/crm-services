import { authorizedFetch } from '@/shared/api/authorizedFetch';

// NOTE: hand-written until Orval generates a typed client from contracts/openapi.json
// (see contracts/README.md, Step 7/Phase 16). Shape mirrors contracts/openapi/appointments/schemas.yaml.
export type AppointmentStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';

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

export interface Appointment {
  id: string;
  companyId: string;
  serviceId: string;
  specialistProfileId: string | null;
  clientUserId: string;
  requestedStartAt: string;
  status: AppointmentStatus;
  notes: string | null;
  respondedAt: string | null;
  completedAt: string | null;
  hasReview?: boolean;
  company?: AppointmentCompanySummary;
  service?: AppointmentServiceSummary;
  specialist?: AppointmentSpecialistSummary;
  client?: AppointmentClientSummary;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAppointmentInput {
  serviceId: string;
  specialistProfileId?: string | null;
  requestedStartAt: string;
  notes?: string | null;
}

export interface StatusHistoryEntry {
  id: string;
  entityType: 'appointment' | 'company' | 'service' | 'specialist_profile';
  entityId: string;
  fromStatus: string | null;
  toStatus: string;
  changedByUserId: string | null;
  reason: string | null;
  createdAt: string;
}

async function parseJsonOrThrow<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => undefined)) as { error?: { message?: string } } | T | undefined;

  if (!response.ok) {
    const message =
      body && typeof body === 'object' && 'error' in body ? body.error?.message : undefined;
    throw new Error(message ?? `Request failed with status ${response.status}`);
  }

  return body as T;
}

export async function createAppointment(companyId: string, input: CreateAppointmentInput): Promise<Appointment> {
  const response = await authorizedFetch(`/companies/${companyId}/appointments`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  const body = await parseJsonOrThrow<{ data: Appointment }>(response);
  return body.data;
}

export async function fetchCompanyAppointments(companyId: string): Promise<Appointment[]> {
  const response = await authorizedFetch(`/companies/${companyId}/appointments`);
  const body = await parseJsonOrThrow<{ data: Appointment[] }>(response);
  return body.data;
}

export async function respondToAppointment(
  companyId: string,
  appointmentId: string,
  status: 'approved' | 'rejected',
): Promise<Appointment> {
  const response = await authorizedFetch(`/companies/${companyId}/appointments/${appointmentId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  const body = await parseJsonOrThrow<{ data: Appointment }>(response);
  return body.data;
}

export async function completeAppointment(companyId: string, appointmentId: string): Promise<Appointment> {
  const response = await authorizedFetch(`/companies/${companyId}/appointments/${appointmentId}/complete`, {
    method: 'POST',
  });
  const body = await parseJsonOrThrow<{ data: Appointment }>(response);
  return body.data;
}

export async function fetchMyAppointments(): Promise<Appointment[]> {
  const response = await authorizedFetch('/appointments/me');
  const body = await parseJsonOrThrow<{ data: Appointment[] }>(response);
  return body.data;
}

export async function cancelAppointment(appointmentId: string): Promise<Appointment> {
  const response = await authorizedFetch(`/appointments/${appointmentId}/cancel`, {
    method: 'POST',
  });
  const body = await parseJsonOrThrow<{ data: Appointment }>(response);
  return body.data;
}

export async function fetchAppointmentStatusHistory(appointmentId: string): Promise<StatusHistoryEntry[]> {
  const response = await authorizedFetch(`/appointments/${appointmentId}/status-history`);
  const body = await parseJsonOrThrow<{ data: StatusHistoryEntry[] }>(response);
  return body.data;
}
