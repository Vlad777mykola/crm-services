# Shared / Polymorphic Table Audit

## Goal

Find tables shared across multiple future service boundaries through a discriminator
column (`entityType`, `aggregateType`, `sourceType`, `ownerType`, etc.), because these
cannot be extracted the same way as a normal one-service-owns-one-table case. If left
unresolved, two or more extracted services would end up needing write access to the
same physical table — which is exactly the "distributed monolith" pattern the
database rules in `service-ownership.md` forbid.

This audit was run against every entity in `backend/src/modules/**/*.entity.ts` (15
entities total) plus the outbox/processed-events infrastructure tables.

## Known case: `status_history_entries`

```16:23:backend/src/modules/audit/status-history.entity.ts
@Entity({ name: 'status_history_entries' })
export class StatusHistoryEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'varchar', length: 50 })
  entityType!: AuditEntityType;
```

| Field | Value |
|---|---|
| **Table name** | `status_history_entries` |
| **Discriminator column** | `entityType` (`AuditEntityType` enum) |
| **Discriminator values** | `appointment`, `company`, `service`, `specialist_profile` |
| **Current writers** | `backend/src/modules/audit/status-history.service.ts` (`recordStatusChange()`), called from `companies.service.ts`, `services.service.ts`, `appointments.service.ts`, and the specialists module |
| **Current readers** | `getCompanyStatusHistory()`, `getServiceStatusHistory()`, `getMySpecialistStatusHistory()`, `getAppointmentStatusHistory()` — one per domain, all querying the same table filtered by `entityType` + `entityId` |
| **Confirmed: no per-domain duplicate exists.** There is no separate `appointment_status_history`, `company_status_history`, `service_status_history`, or `specialist_status_history` table anywhere in the codebase (verified: zero matches for `appointment_status_history` repo-wide; only 15 entity files exist total, `status-history.entity.ts` is the only audit-related one). | |

### Why this blocks naive extraction

If `companies-service` and `specialists-service` are both extracted while both still
point at `status_history_entries` in the main DB, both services need **write access**
to the same physical table, violating "no service writes another service's tables."
Read-only access from legacy would also break, since legacy loses ownership of the
company/specialist business tables that the history rows reference.

### Decision

**Chosen strategy: A — split into per-service tables during each domain's own
extraction.** (Not B — do not stand up a dedicated audit-service/status-history-service
at this stage; it adds a new service before any of the four owning domains are even
extracted, which contradicts "do not split everything at once.")

| New table | Owning service | Schema | Created in phase |
|---|---|---|---|
| `company_status_history` | companies-service | `companies_schema` | Phase 4 |
| `specialist_status_history` | specialists-service | `specialists_schema` | Phase 6 |
| `service_status_history` | services-catalog-service | `services_schema` | Phase 8 |
| `appointment_status_history` | appointments-service | `appointments_schema` | Phase 9 |

Each new table drops the `entityType` discriminator column (no longer needed — one
table per domain) but otherwise keeps the same shape as `StatusHistoryEntry`:

```txt
id                uuid primary key
entity_id         uuid          -- was entityId; company_id / service_id / etc. once split
from_status       varchar(50) null
to_status         varchar(50)
changed_by_user_id uuid null
reason            text null
created_at        timestamptz
```

### Split strategy (per phase, no data migration)

Existing data does not need to be preserved (confirmed by user). Each domain phase
(4, 6, 8, 9) performs its own slice of this split independently, with no backfill
step:

```txt
1. Create the new per-service table in the service's own schema, empty.
2. Point the extracted service's read/write status-history logic at the new table.
3. Old rows in the legacy status_history_entries table are left in place and simply
   stop being read/written once that domain's routes are cut over to the new
   service — no migration, no reconciliation.
```

### Rollback strategy

Rolling a domain back to legacy only requires re-routing the gateway path back to
legacy-backend. Legacy's own `status_history_entries` rows for that `entityType` are
untouched (legacy never had them deleted), so legacy resumes exactly where it left
off pre-cutover — any history recorded in the new per-service table during the
extracted window is simply lost on rollback, which is acceptable given the "data can
be discarded" policy.

### Affected phases

- **Phase 4 (companies-service):** must not write to shared `status_history_entries`
  after extraction. Target: `companies_schema.company_status_history`.
- **Phase 6 (specialists-service):** target `specialists_schema.specialist_status_history`.
- **Phase 8 (services-catalog-service):** target `services_schema.service_status_history`.
- **Phase 9 (appointments-service):** target `appointments_schema.appointment_status_history`
  (a **new** table created during extraction — it does not rename or reuse any existing
  table, since no appointment-specific status history table exists today).

## Other candidates checked (none found to be shared/polymorphic)

| Table | Discriminator? | Verdict |
|---|---|---|
| `outbox_events` | No — single-purpose queue table, not a business/read table | Not polymorphic; already has its own per-service split plan (Q8: one outbox-publisher deployment per service, each pointed at that service's own `outbox_events`) |
| `processed_events` | No — will be duplicated per-consumer by design already (per `service-ownership.md` rule 5) | Not an issue; each service already gets its own copy |
| `notifications` / `email_logs` | No discriminator column found; single owner (notifications-service) per `service-ownership.md` | Not shared across multiple *future* service boundaries |
| `sessions`, `auth_identities`, `users`, `companies`, `company_members`, `specialist_profiles`, `company_specialists`, `company_specialist_requests`, `services`, `service_specialists`, `appointments`, `reviews` | No | Each maps to exactly one future owning service; no discriminator pattern |

## Done when

`status_history_entries` has an explicit split plan (this document) before extracting
companies (Phase 4), specialists (Phase 6), services-catalog (Phase 8), or
appointments (Phase 9). Each of those phase documents in
`microservices-extraction-checklist.md` must reference this file rather than saying
"status history data if owned."

**Stop — awaiting approval before proceeding to Task A.**
