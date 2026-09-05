export interface UpdateAppointmentNotesCommand {
  companyId: string;
  appointmentId: string;
  requesterUserId: string;
  notes: string | null;
}
