export interface CompleteAppointmentCommand {
  companyId: string;
  appointmentId: string;
  requesterUserId: string;
  correlationId?: string;
}
