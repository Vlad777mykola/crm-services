import type { DataSource } from 'typeorm';

import { findCompletedAppointmentForClient } from '../../db/legacy-appointments-bridge.js';
import type { AppointmentForReview, AppointmentReviewLookup } from '../ports/appointment-review-lookup.js';

export class TypeOrmAppointmentReviewLookup implements AppointmentReviewLookup {
  constructor(private readonly dataSource: DataSource) {}

  findCompletedAppointmentForClient(
    appointmentId: string,
    clientUserId: string,
  ): Promise<AppointmentForReview | undefined> {
    return findCompletedAppointmentForClient(this.dataSource, appointmentId, clientUserId);
  }
}
