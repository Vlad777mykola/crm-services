export interface CreateReviewRequest {
  rating: number;
  comment?: string | null;
}

export interface AppointmentOnlyIdParams {
  appointmentId: string;
}

export interface CompanyIdParams {
  companyId: string;
}

export interface ServiceOnlyIdParams {
  serviceId: string;
}

export interface SpecialistIdParams {
  specialistId: string;
}
