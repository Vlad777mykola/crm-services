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

Port **4010** — see `docs/architecture/service-port-registry.md`.
