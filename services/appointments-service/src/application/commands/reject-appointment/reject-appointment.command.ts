export interface RejectAppointmentCommand {
  companyId: string;
  appointmentId: string;
  requesterUserId: string;
  correlationId?: string;
}
