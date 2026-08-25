export interface AppointmentForReview {
  companyId: string;
  serviceId: string;
  specialistProfileId: string | null;
  serviceName: string | null;
  status: string;
}

export interface AppointmentReviewLookup {
  findCompletedAppointmentForClient(appointmentId: string, clientUserId: string): Promise<AppointmentForReview | undefined>;
}
