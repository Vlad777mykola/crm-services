import 'reflect-metadata';

import { DataSource } from 'typeorm';

import { env } from '@/env/env.js';
import { AuthIdentity } from '@/modules/auth/identities/auth-identity.entity.js';
import { Session } from '@/modules/auth/sessions/session.entity.js';
import { CompanyMember } from '@/modules/company-members/company-member.entity.js';
import { CompanySpecialist } from '@/modules/company-specialists/company-specialist.entity.js';
import { CompanySpecialistRequest } from '@/modules/company-specialists/company-specialist-request.entity.js';
import { Appointment } from '@/modules/appointments/appointment.entity.js';
import { Company } from '@/modules/companies/company.entity.js';
import { Notification } from '@/modules/notifications/notification.entity.js';
import { Review } from '@/modules/reviews/review.entity.js';
import { ServiceSpecialist } from '@/modules/services/service-specialist.entity.js';
import { Service } from '@/modules/services/service.entity.js';
import { SpecialistProfile } from '@/modules/specialists/specialist-profile.entity.js';
import { User } from '@/modules/users/user.entity.js';

const isProduction = env.NODE_ENV === 'production';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: env.DATABASE_URL,
  synchronize: env.NODE_ENV === 'development',
  logging: env.NODE_ENV === 'development',
  entities: [
    User,
    AuthIdentity,
    Session,
    Company,
    CompanyMember,
    SpecialistProfile,
    CompanySpecialistRequest,
    CompanySpecialist,
    Service,
    ServiceSpecialist,
    Appointment,
    Notification,
    Review,
  ],
  migrations: [
    isProduction
      ? 'dist/infrastructure/database/migrations/*.js'
      : 'src/infrastructure/database/migrations/*.ts',
  ],
  migrationsTableName: 'migrations',
});
