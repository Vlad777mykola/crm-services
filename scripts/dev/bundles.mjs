/**
 * Local dev service + bundle registry. Ports match docs/architecture/service-port-registry.md.
 */

/** @typedef {{ dir: string; port: number; label: string }} ServiceDef */
/** @typedef {{ schema: string; healthPort: number; label: string }} OutboxDef */

/** @type {Record<string, ServiceDef>} */
export const SERVICES = {
  auth: { dir: 'services/auth-service', port: 4001, label: 'auth-service' },
  users: { dir: 'services/users-service', port: 4002, label: 'users-service' },
  companies: { dir: 'services/companies-service', port: 4003, label: 'companies-service' },
  'company-members': { dir: 'services/company-members-service', port: 4004, label: 'company-members-service' },
  specialists: { dir: 'services/specialists-service', port: 4005, label: 'specialists-service' },
  'company-specialists': { dir: 'services/company-specialists-service', port: 4006, label: 'company-specialists-service' },
  'services-catalog': { dir: 'services/services-catalog-service', port: 4007, label: 'services-catalog-service' },
  appointments: { dir: 'services/appointments-service', port: 4008, label: 'appointments-service' },
  reviews: { dir: 'services/reviews-service', port: 4009, label: 'reviews-service' },
  notifications: { dir: 'services/notifications-service', port: 4300, label: 'notifications-service' },
  dashboard: { dir: 'services/dashboard-service', port: 4010, label: 'dashboard-service' },
  // Student/dev-only - see docs/students/rabitmq/lab-service/START-HERE.md.
  // Never deployed to production; not in compose.services.yml.
  'rabbitmq-lab': { dir: 'services/rabbitmq-lab-service', port: 4011, label: 'rabbitmq-lab-service' },
};

/** @type {Record<string, OutboxDef>} */
export const OUTBOX = {
  auth: { schema: 'auth_schema', healthPort: 4501, label: 'outbox-publisher (auth)' },
  users: { schema: 'users_schema', healthPort: 4502, label: 'outbox-publisher (users)' },
  companies: { schema: 'companies_schema', healthPort: 4503, label: 'outbox-publisher (companies)' },
  'company-members': { schema: 'company_members_schema', healthPort: 4504, label: 'outbox-publisher (company-members)' },
  specialists: { schema: 'specialists_schema', healthPort: 4505, label: 'outbox-publisher (specialists)' },
  'company-specialists': { schema: 'company_specialists_schema', healthPort: 4506, label: 'outbox-publisher (company-specialists)' },
  'services-catalog': { schema: 'services_schema', healthPort: 4507, label: 'outbox-publisher (services-catalog)' },
  appointments: { schema: 'appointments_schema', healthPort: 4508, label: 'outbox-publisher (appointments)' },
  reviews: { schema: 'reviews_schema', healthPort: 4509, label: 'outbox-publisher (reviews)' },
};

/**
 * Named bundles — lists of keys: service id, `outbox:<id>`, or `frontend`.
 * Gateway (Traefik :8080) routes paths to these host ports via host.docker.internal.
 *
 * @type {Record<string, { keys: string[]; description: string }>}
 */
export const BUNDLES = {
  'auth-users': {
    description: 'Register/login + user profile consumer (auth :4001, users :4002, outbox-auth :4501)',
    keys: ['auth', 'users', 'outbox:auth'],
  },
  'auth-users:app': {
    description: 'Frontend + auth-users bundle (VITE_API_URL=http://localhost:8080)',
    keys: ['frontend', 'auth', 'users', 'outbox:auth'],
  },
  companies: {
    description: 'Public company list (companies-service :4003)',
    keys: ['companies'],
  },
  'companies:app': {
    description: 'Frontend + companies-service',
    keys: ['frontend', 'companies'],
  },
  'companies-members': {
    description: 'Company CRUD + members consumer (companies, company-members, outbox companies)',
    keys: ['companies', 'company-members', 'outbox:companies'],
  },
  'companies-members:app': {
    description: 'Frontend + companies-members bundle',
    keys: ['frontend', 'companies', 'company-members', 'outbox:companies'],
  },
  'dashboard:app': {
    description: 'Frontend + auth + users + outbox-auth + dashboard (:4010) for /app/summary',
    keys: ['frontend', 'auth', 'users', 'outbox:auth', 'dashboard'],
  },
  dashboard: {
    description: 'GET /app/summary via dashboard-service :4010 (needs auth token)',
    keys: ['auth', 'users', 'outbox:auth', 'dashboard'],
  },
};

export const PREFIX_COLORS = ['blue', 'green', 'yellow', 'magenta', 'cyan', 'red', 'white', 'gray'];
