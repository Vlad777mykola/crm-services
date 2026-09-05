export interface ApproveAppointmentCommand {
  companyId: string;
  appointmentId: string;
  requesterUserId: string;
  correlationId?: string;
}
