export interface CreateAppointmentRequest {
  serviceId: string;
  specialistProfileId?: string | null;
  requestedStartAt: string;
  notes?: string | null;
}

export interface RespondToAppointmentRequest {
  status: 'approved' | 'rejected';
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
