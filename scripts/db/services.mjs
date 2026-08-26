export const MIGRATABLE_SERVICES = [
  {
    name: 'users-service',
    workspace: '@crm/users-service',
    path: 'services/users-service',
    migrationsTable: 'typeorm_migrations_users',
    schema: 'users_schema',
  },
  {
    name: 'specialists-service',
    workspace: '@crm/specialists-service',
    path: 'services/specialists-service',
    migrationsTable: 'typeorm_migrations_specialists',
    schema: 'specialists_schema',
  },
  {
    name: 'appointments-service',
    workspace: '@crm/appointments-service',
    path: 'services/appointments-service',
    migrationsTable: 'typeorm_migrations_appointments',
    schema: 'appointments_schema',
  },
];
