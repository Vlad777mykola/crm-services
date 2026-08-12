import type { Pool } from 'pg';

export interface AppointmentForReview {
  companyId: string;
  serviceId: string;
  specialistProfileId: string | null;
  serviceName: string | null;
  status: string;
}

/**
 * TEMPORARY, EXPLICITLY FLAGGED CROSS-SCHEMA READ - same pattern/rationale as
 * the bridges in companies-service/company-specialists-service/etc.
 *
 * Reviews must be created only for the requesting client's own COMPLETED
 * appointment, and need companyId/serviceId/specialistProfileId denormalized
 * onto the review row. None of appointments-service's published events
 * (`appointment.requested/.approved/.rejected/.completed/.cancelled`) carry
 * `specialistProfileId` (Task 9.5 reused those contracts as-is, unchanged
 * from legacy), so a projection fed purely by events can't recover it - and
 * `GET /specialists/:specialistId/reviews` (one of Phase 10's 4 confirmed
 * routes) depends on it. Reads `appointments_schema.appointments` directly
 * instead. Remove once/if an appointment event carries `specialistProfileId`.
 */
export async function findCompletedAppointmentForClient(
  pool: Pool,
  appointmentId: string,
  clientUserId: string,
): Promise<AppointmentForReview | undefined> {
  const { rows } = await pool.query<AppointmentForReview>(
    `SELECT a."companyId", a."serviceId", a."specialistProfileId", a."status", s."name" AS "serviceName"
     FROM appointments_schema.appointments a
     LEFT JOIN appointments_schema.appointment_service_projection s ON s."serviceId" = a."serviceId"
     WHERE a."id" = $1 AND a."clientUserId" = $2`,
    [appointmentId, clientUserId],
  );
  return rows[0];
}
