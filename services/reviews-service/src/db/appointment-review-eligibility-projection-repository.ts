import type { DataSource, EntityManager } from 'typeorm';

import type { AppointmentForReview } from '../application/ports/appointment-review-lookup.js';

type Queryable = DataSource | EntityManager;

export interface ReviewEligibilityProjectionInput {
  appointmentId: string;
  companyId: string;
  serviceId: string;
  clientUserId: string;
  specialistProfileId: string | null;
  serviceName: string | null;
  completedAt: string | Date;
}

export async function upsertReviewEligibilityProjection(
  client: Queryable,
  input: ReviewEligibilityProjectionInput,
): Promise<void> {
  await client.query(
    `INSERT INTO reviews_schema.appointment_review_eligibility_projection
       ("appointmentId", "companyId", "serviceId", "clientUserId", "specialistProfileId", "serviceName", "completedAt", "reviewAllowed")
     VALUES ($1, $2, $3, $4, $5, $6, $7, true)
     ON CONFLICT ("appointmentId") DO UPDATE
     SET "companyId" = EXCLUDED."companyId",
         "serviceId" = EXCLUDED."serviceId",
         "clientUserId" = EXCLUDED."clientUserId",
         "specialistProfileId" = EXCLUDED."specialistProfileId",
         "serviceName" = EXCLUDED."serviceName",
         "completedAt" = EXCLUDED."completedAt",
         "reviewAllowed" = true,
         "updatedAt" = now()`,
    [
      input.appointmentId,
      input.companyId,
      input.serviceId,
      input.clientUserId,
      input.specialistProfileId,
      input.serviceName,
      input.completedAt,
    ],
  );
}

export async function findCompletedAppointmentForClient(
  client: Queryable,
  appointmentId: string,
  clientUserId: string,
): Promise<AppointmentForReview | undefined> {
  const rows = await client.query<AppointmentForReview[]>(
    `SELECT "companyId", "serviceId", "specialistProfileId", "serviceName", 'completed' AS "status"
     FROM reviews_schema.appointment_review_eligibility_projection
     WHERE "appointmentId" = $1 AND "clientUserId" = $2 AND "reviewAllowed" = true
     LIMIT 1`,
    [appointmentId, clientUserId],
  );
  return rows[0];
}
