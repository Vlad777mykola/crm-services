# dashboard-service

Read-only aggregation for dashboard routes (Phase 15 Option B).

## Owned routes

| Method | Path | Auth |
|---|---|---|
| GET | `/app/summary` | required |
| GET | `/companies/:companyId/summary` | required (owner/manager) |

## Notes

Cross-schema read-only SQL across `notifications_schema`, `company_members_schema`,
`companies_schema`, `specialists_schema`, `appointments_schema`,
`company_specialists_schema`, and `services_schema`. No owned tables.

## Capabilities (`permissions[]`)

Both summaries include a `permissions[]` array (see `contracts/permissions/actions.ts`
for the vocabulary and `src/modules/dashboard/dashboard-permissions.ts` for the
mapping from role to permission names). This is a **frontend-only UX gate**
(hide/show controls) computed from the caller's role at read time - it is not
itself an authorization mechanism and must stay in sync by hand with the
actual enforcement in each owning service (company-members-service,
appointments-service, etc). Never trust this array server-side.

Port **4010** — see `docs/architecture/service-port-registry.md`.
