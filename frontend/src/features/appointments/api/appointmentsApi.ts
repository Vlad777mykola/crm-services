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
  startAt: string;
  endAt: string;
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
  specialistProfileId: string;
  requestedStartAt?: string;
  mode?: 'exact' | 'next_available';
  windowFrom?: string;
  windowTo?: string;
  notes?: string | null;
}

export interface AvailableSlot {
  startAt: string;
  endAt: string;
}

export interface AvailableSlotsQuery {
  companyId: string;
  serviceId: string;
  specialistProfileId: string;
  from: string;
  to: string;
  slotStepMinutes?: number;
  limit?: number;
}

export interface AvailabilityRule {
  id?: string;
  companyId?: string;
  specialistProfileId?: string;
  weekday: number;
  startTime: string;
  endTime: string;
  timezone: string;
  active: boolean;
}

export interface TimeBlock {
  id: string;
  companyId: string;
  specialistProfileId?: string;
  startsAt: string;
  endsAt: string;
  reason: string | null;
  createdByUserId: string | null;
  createdAt: string;
}

export interface AvailabilitySettings {
  rules: AvailabilityRule[];
  blocks: TimeBlock[];
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

export async function fetchAvailableSlots(query: AvailableSlotsQuery): Promise<AvailableSlot[]> {
  const params = new URLSearchParams({
    companyId: query.companyId,
    serviceId: query.serviceId,
    specialistProfileId: query.specialistProfileId,
    from: query.from,
    to: query.to,
  });
  if (query.slotStepMinutes) params.set('slotStepMinutes', String(query.slotStepMinutes));
  if (query.limit) params.set('limit', String(query.limit));

  const response = await authorizedFetch(`/appointments/available-slots?${params.toString()}`);
  const body = await parseJsonOrThrow<{ data: AvailableSlot[] }>(response);
  return body.data;
}

export async function fetchCompanyAvailability(companyId: string): Promise<AvailabilitySettings> {
  const response = await authorizedFetch(`/companies/${companyId}/availability`);
  const body = await parseJsonOrThrow<{ data: AvailabilitySettings }>(response);
  return body.data;
}

export async function setCompanyAvailability(
  companyId: string,
  rules: Array<Pick<AvailabilityRule, 'weekday' | 'startTime' | 'endTime' | 'timezone' | 'active'>>,
): Promise<AvailabilityRule[]> {
  const response = await authorizedFetch(`/companies/${companyId}/availability`, {
    method: 'PUT',
    body: JSON.stringify({ rules }),
  });
  const body = await parseJsonOrThrow<{ data: AvailabilityRule[] }>(response);
  return body.data;
}

export async function addCompanyTimeBlock(
  companyId: string,
  input: { startsAt: string; endsAt: string; reason?: string | null },
): Promise<TimeBlock> {
  const response = await authorizedFetch(`/companies/${companyId}/time-blocks`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  const body = await parseJsonOrThrow<{ data: TimeBlock }>(response);
  return body.data;
}

export async function deleteCompanyTimeBlock(companyId: string, blockId: string): Promise<void> {
  const response = await authorizedFetch(`/companies/${companyId}/time-blocks/${blockId}`, { method: 'DELETE' });
  if (!response.ok) await parseJsonOrThrow(response);
}

export async function fetchSpecialistAvailability(
  companyId: string,
  specialistProfileId: string,
): Promise<AvailabilitySettings> {
  const response = await authorizedFetch(`/companies/${companyId}/specialists/${specialistProfileId}/availability`);
  const body = await parseJsonOrThrow<{ data: AvailabilitySettings }>(response);
  return body.data;
}

export async function setSpecialistAvailability(
  companyId: string,
  specialistProfileId: string,
  rules: Array<Pick<AvailabilityRule, 'weekday' | 'startTime' | 'endTime' | 'timezone' | 'active'>>,
): Promise<AvailabilityRule[]> {
  const response = await authorizedFetch(`/companies/${companyId}/specialists/${specialistProfileId}/availability`, {
    method: 'PUT',
    body: JSON.stringify({ rules }),
  });
  const body = await parseJsonOrThrow<{ data: AvailabilityRule[] }>(response);
  return body.data;
}

export async function addSpecialistTimeBlock(
  companyId: string,
  specialistProfileId: string,
  input: { startsAt: string; endsAt: string; reason?: string | null },
): Promise<TimeBlock> {
  const response = await authorizedFetch(`/companies/${companyId}/specialists/${specialistProfileId}/time-blocks`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  const body = await parseJsonOrThrow<{ data: TimeBlock }>(response);
  return body.data;
}

export async function deleteSpecialistTimeBlock(
  companyId: string,
  specialistProfileId: string,
  blockId: string,
): Promise<void> {
  const response = await authorizedFetch(
    `/companies/${companyId}/specialists/${specialistProfileId}/time-blocks/${blockId}`,
    { method: 'DELETE' },
  );
  if (!response.ok) await parseJsonOrThrow(response);
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
