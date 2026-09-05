export interface CreateAppointmentRequest {
  serviceId: string;
  specialistProfileId: string;
  requestedStartAt?: string;
  windowFrom?: string;
  windowTo?: string;
  mode?: 'exact' | 'next_available';
  notes?: string | null;
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

export interface RespondToAppointmentRequest {
  status: 'approved' | 'rejected';
}

export interface RescheduleAppointmentRequest {
  specialistProfileId?: string;
  startAt: string;
}

export interface ReassignAppointmentSpecialistRequest {
  specialistProfileId: string;
}

export interface ChangeAppointmentServiceRequest {
  serviceId: string;
}

export interface UpdateAppointmentNotesRequest {
  notes: string | null;
}

export interface ListAppointmentsQuery {
  companyId?: string;
  from?: string;
  to?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';
  serviceId?: string;
  specialistProfileId?: string;
  limit?: number;
}

export interface AvailabilityRuleRequest {
  weekday: number;
  startTime: string;
  endTime: string;
  timezone?: string;
  active?: boolean;
}

export interface SetAvailabilityRulesRequest {
  rules: AvailabilityRuleRequest[];
}

export interface CreateTimeBlockRequest {
  startsAt: string;
  endsAt: string;
  reason?: string | null;
}

export interface CompanyIdParams {
  companyId: string;
}

export interface AppointmentIdParams {
  companyId: string;
  appointmentId: string;
}

export interface AppointmentOnlyIdParams {
  appointmentId: string;
}

export interface SpecialistAvailabilityParams {
  companyId: string;
  specialistProfileId: string;
}

export interface TimeBlockParams {
  companyId: string;
  blockId: string;
}

export interface SpecialistTimeBlockParams {
  companyId: string;
  specialistProfileId: string;
  blockId: string;
}
