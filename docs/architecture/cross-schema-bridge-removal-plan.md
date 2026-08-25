# Cross-Schema Bridge Removal Plan

## Goal

Each service reads only its own schema. Data needed from another service must be stored in a local projection fed by events. No historical data migration or backfill is required; seed/bootstrap data is the source of local development correctness.

## Rules

- Do not add new direct reads of another service schema.
- Do not move business authorization into Traefik.
- Do not put roles, company ids, or permissions into JWTs.
- Do not create a search-service for specialist search yet.
- Do not preserve or backfill existing production-like data for these removals.
- Keep `scripts/fill_dump_db` aligned when schema/data shape changes are needed for seed commands.

## Bridge Inventory

| service | file | external schema read | reason | replacement projection | events needed | status |
|---|---|---|---|---|---|---|
| companies-service | `src/db/legacy-company-members-bridge.ts` | `company_members_schema.company_members` | company management authorization and member company listing | `companies_schema.company_membership_projection` | `company-member.added`, `company-member.role_changed`, `company-member.removed` | MIGRATED |
| services-catalog-service | `src/db/legacy-company-members-bridge.ts` | `company_members_schema.company_members` | company role checks for service writes | `services_schema.company_membership_projection` | `company-member.added`, `company-member.role_changed`, `company-member.removed` | MIGRATED |
| company-specialists-service | `src/db/legacy-company-members-bridge.ts` | `company_members_schema.company_members` | company role checks for specialist requests | `company_specialists_schema.company_membership_projection` | `company-member.added`, `company-member.role_changed`, `company-member.removed` | MIGRATED |
| company-specialists-service | `src/db/legacy-specialists-bridge.ts` | `specialists_schema.specialist_profiles` | specialist profile lookup by id/user | `company_specialists_schema.specialist_profile_projection` | `specialist.created`, `specialist.updated` | TODO |
| services-catalog-service | `src/db/legacy-specialists-bridge.ts` | `specialists_schema.specialist_profiles` | resolve specialist profile id for service assignment queries | `services_schema.specialist_profile_projection` | `specialist.created`, `specialist.updated` | TODO |
| services-catalog-service | `src/db/legacy-company-specialists-bridge.ts` | `company_specialists_schema.company_specialists` | validate active company specialist before service assignment | `services_schema.company_specialist_projection` | `company-specialist.accepted`, `company-specialist.removed` | TODO |
| appointments-service | `src/db/legacy-users-bridge.ts` | `users_schema.user_profiles` | enrich appointment responses with client name | `appointments_schema.client_profiles_projection` | `user.profile_created`, `user.profile_updated` | MIGRATED |
| reviews-service | `src/db/legacy-appointments-bridge.ts` | `appointments_schema.appointments`, `appointments_schema.appointment_service_projection` | validate review eligibility and copy appointment review context | `reviews_schema.appointment_review_eligibility_projection` | `appointment.review_eligible` | MIGRATED |
| dashboard-service | `src/modules/dashboard/dashboard.service.ts` | multiple service schemas | build live dashboard summaries | `dashboard_schema.company_dashboard_summary` and related read model tables | company, appointment, review, service, and company-specialist events | TODO |

## Membership Projection Pattern

Use this table shape for company role checks in services that need authorization:

```sql
CREATE TABLE company_membership_projection (
  "companyId" uuid NOT NULL,
  "userId" uuid NOT NULL,
  "role" text NOT NULL,
  "status" text NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("companyId", "userId")
);
```

Repository/service method names:

```ts
findMembership(companyId: string, userId: string)
requireCompanyRole(companyId: string, userId: string, allowedRoles: CompanyRole[])
canManageCompany(companyId: string, userId: string)
```

## Appointments Client Profile Projection

Target table:

```sql
CREATE TABLE client_profiles_projection (
  "userId" uuid PRIMARY KEY,
  "name" text,
  "email" text,
  "phone" text,
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
```

Target repository:

```ts
findClientProfile(userId: string)
```

## Reviews Appointment Eligibility Projection

Target table:

```sql
CREATE TABLE appointment_review_eligibility_projection (
  "appointmentId" uuid PRIMARY KEY,
  "companyId" uuid NOT NULL,
  "clientUserId" uuid NOT NULL,
  "specialistProfileId" uuid,
  "completedAt" timestamptz,
  "reviewAllowed" boolean NOT NULL DEFAULT false,
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
```

Prefer `appointment.review_eligible` if `appointment.completed.v1` cannot safely carry all review context.

## Rollout Order

1. Add projections and event consumers behind existing bridge reads.
2. Update `scripts/fill_dump_db` for any seed-required projection data.
3. Switch authorization/query services to projection repositories.
4. Delete each `legacy-*-bridge.ts` file after its service passes tests.
5. Move dashboard-service behind a `DASHBOARD_READ_MODEL_ENABLED` flag before removing direct reads.

## Validation Commands

```bash
yarn db:seed:full:reset --target dev
yarn test:unit
yarn verify:architecture
```
