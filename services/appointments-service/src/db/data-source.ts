import 'reflect-metadata';
import { DataSource } from 'typeorm';

import { env } from '../env.js';
import { AppointmentCompanyProjectionEntity } from './entities/appointment-company-projection.entity.js';
import { AppointmentMembershipProjectionEntity } from './entities/appointment-membership-projection.entity.js';
import { AppointmentRecommendationProjectionEntity } from './entities/appointment-recommendation-projection.entity.js';
import { AppointmentServiceSpecialistProjectionEntity } from './entities/appointment-service-specialist-projection.entity.js';
import { AppointmentServiceProjectionEntity } from './entities/appointment-service-projection.entity.js';
import { AppointmentStatusHistoryEntity } from './entities/appointment-status-history.entity.js';
import { AppointmentEntity } from './entities/appointment.entity.js';
import { OutboxEventEntity } from './entities/outbox-event.entity.js';
import { ProcessedEventEntity } from './entities/processed-event.entity.js';

export function createDataSource(): DataSource {
  return new DataSource({
    type: 'postgres',
    url: env.DATABASE_URL,
    entities: [
      AppointmentEntity,
      AppointmentStatusHistoryEntity,
      AppointmentMembershipProjectionEntity,
      AppointmentCompanyProjectionEntity,
      AppointmentServiceProjectionEntity,
      AppointmentServiceSpecialistProjectionEntity,
      AppointmentRecommendationProjectionEntity,
      ProcessedEventEntity,
      OutboxEventEntity,
    ],
    synchronize: false,
    logging: false,
  });
}
