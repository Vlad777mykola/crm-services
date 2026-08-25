import type { AppointmentRow } from '../../db/appointment-repository.js';

export interface AppointmentResponse extends AppointmentRow {
  hasReview: boolean;
}

export function toAppointmentResponse(row: AppointmentRow): AppointmentResponse {
  return { ...row, hasReview: false };
}
