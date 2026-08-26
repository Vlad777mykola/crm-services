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
import { ClientProfileProjectionEntity } from './entities/client-profile-projection.entity.js';
import { CompanyAvailabilityRuleEntity } from './entities/company-availability-rule.entity.js';
import { CompanyTimeBlockEntity } from './entities/company-time-block.entity.js';
import { OutboxEventEntity } from './entities/outbox-event.entity.js';
import { ProcessedEventEntity } from './entities/processed-event.entity.js';
import { SpecialistAvailabilityRuleEntity } from './entities/specialist-availability-rule.entity.js';
import { SpecialistTimeBlockEntity } from './entities/specialist-time-block.entity.js';
import { InitAppointmentsSchema2026082500001 } from './migrations/2026082500001-InitAppointmentsSchema.js';

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
      ClientProfileProjectionEntity,
      CompanyAvailabilityRuleEntity,
      CompanyTimeBlockEntity,
      SpecialistAvailabilityRuleEntity,
      SpecialistTimeBlockEntity,
      ProcessedEventEntity,
      OutboxEventEntity,
    ],
    migrations: [InitAppointmentsSchema2026082500001],
    migrationsTableName: 'typeorm_migrations_appointments',
    synchronize: false,
    logging: false,
  });
}
