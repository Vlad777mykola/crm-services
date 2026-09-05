export interface ReassignAppointmentSpecialistCommand {
  companyId: string;
  appointmentId: string;
  requesterUserId: string;
  specialistProfileId: string;
  correlationId?: string;
}
