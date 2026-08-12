# Microservices Extraction Checklist

Route-parity-first strangler extraction. Read alongside:

- `route-inventory.md` — every route that exists today; source of truth for what to extract.
- `current-to-target-delta.md` — what already exists vs. what's actually new work.
- `url-convention.md` — no `/api` prefix, ordered gateway routing.
- `table-ownership-matrix.md` — every table's future owner.
- `shared-polymorphic-table-audit.md` — `status_history_entries` split plan.
- `event-catalog.md` — implemented vs. planned events, contract-first gate.
- `service-skeleton-standard.md` — one folder structure, middleware baseline, and README template for every new service.
- `dockerfile-standard.md` — one multi-stage Docker build pattern for every new service.
- `service-port-registry.md` — the only source of truth for ports; never invent one.
- `smoke-checklist-template.md` — manual verification format per phase, replacing automated tests.

**Data policy:** existing data in the database does not need to be preserved (confirmed
by user). No backfill scripts, no dual-write windows, no "existing accounts still work"
requirement anywhere in this checklist. Every extracted service starts with an empty
schema. This removes an entire category of tasks that appeared in earlier plan drafts
(backfill scripts, projection backfill, migration reconciliation).

## Global rules (apply to every phase)

1. Extraction means matching existing behavior first. Any endpoint/status/event/table
   that does not exist today must be marked **NEW FUNCTIONALITY — DO NOT IMPLEMENT
   WITHOUT APPROVAL** (see `route-inventory.md` diff table and `event-catalog.md`
   exclusions).
2. No `/api` prefix, ever.
3. No new test files unless explicitly requested. Running existing lint/typecheck/build
   is fine.
4. No event consumer/producer ships before its schema exists in `contracts/events/`.
5. No data backfill — schemas start empty.
6. Every phase ends with: changed files, what works, what remains on legacy, risks,
   and a stop for approval before continuing. Do not chain phases without confirmation.
7. Every new service follows `service-skeleton-standard.md` (folder layout, middleware
   baseline, README) and `dockerfile-standard.md` (multi-stage build) exactly — do not
   invent a different layout per service.
8. Every new service's port comes from `service-port-registry.md` — never guessed.
9. Every phase produces a filled-in smoke checklist per `smoke-checklist-template.md`
   instead of automated tests, covering every route the phase touches plus any
   event/table side effects.

## Confirmed decisions carried into this checklist

| Q | Decision |
|---|---|
| API prefix | No `/api`, keep current paths |
| Gateway | Routes + CORS + request ID only; no permissions, no JWT validation (for now) |
| Auth/users split | Auth owns identity, users-service owns profile |
| Users-service order | Consumer first (Phase 2), HTTP second (Phase 3) |
| `POST /users` | Keep on legacy temporarily during migration (Q5), decide remove/internal-only after |
| Company order | Companies-service before company-members-service |
| Auth permissions | Local membership projection, not sync HTTP |
| Notifications | Build HTTP API before routing `/notifications/*` to it |
| Outbox model | One reusable `outbox-publisher` image, one deployment per service |
| Dashboard | Stay on legacy until most domains are extracted, then read-api decision |
| Reviews | Separate reviews-service, after appointments-service |
| Redis | Drop from cheap production until a real use case exists |
| Repo strategy | One repo, `services/` folders, split later if ever |
| `service_specialists` ownership (Q13) | **Confirmed:** services-catalog-service owns `services`, `service_specialists`, `/services/:serviceId/specialists`, `/specialists/me/services` |
| `no_show` (Q14) | Do not implement during extraction |
| `company-member.suspended` | **Confirmed excluded** — `CompanyMemberStatus` enum has only `active`/`removed`; do not add this event |
| `ai.job_failed` consumer | **Confirmed: no consumer for now** — schema/publisher stay as-is, no new consumer added |
| Data migration | None — existing data discarded, no backfill anywhere |
| Service skeleton | Every new service follows `service-skeleton-standard.md` + `dockerfile-standard.md` + ports from `service-port-registry.md` |
| Testing | No automated tests; every phase produces a manual smoke checklist per `smoke-checklist-template.md` |

---

## Phase 0 — Baseline (documentation only)

All of the following are already produced. Listed here for completeness/traceability.

| Task | File | Status |
|---|---|---|
| 0.0 | `route-inventory.md` | Done |
| 0.0b | `shared-polymorphic-table-audit.md` | Done |
| 0.0c | `service-skeleton-standard.md` | Done |
| 0.0d | `dockerfile-standard.md` | Done |
| 0.0e | `service-port-registry.md` | Done |
| 0.0f | `smoke-checklist-template.md` | Done |
| A | `current-to-target-delta.md` | Done |
| B | `url-convention.md` | Done |
| C | `table-ownership-matrix.md` | Done |
| D | `event-catalog.md` | Done |
| E | `microservices-extraction-checklist.md` (this file) | Done |

**Stop point:** await approval before Phase 1 (gateway).

---

## Phase 1 — Gateway

**Goal:** introduce a gateway in front of legacy-backend with zero behavior change.

| Task | Description |
|---|---|
| 1.1 | Create `services/gateway/` (nginx config first, unless Traefik requested). Route **every** path from `route-inventory.md` to legacy-backend — not just `/auth`, `/users`, `/companies`; also `/specialists`, `/services`, `/appointments`, `/notifications`, `/health*`, `/app/summary`, `/companies/:id/reviews`, `/services/:id/reviews`, `/specialists/:id/reviews`, `/appointments/:id/review`. |
| 1.2 | Document + implement ordered routing rules per `url-convention.md` (most-specific-first under `/companies/*` and `/specialists/*`), even though every rule points at legacy-backend today — this proves the rule ordering works before any service exists to route to. |
| 1.3 | Add `X-Request-Id` propagation at the gateway; legacy backend reads and logs it if `requestLogger.ts` supports it (extend minimally if not — no full tracing yet). |
| 1.4 | Add `docker-compose.microservices-core.yml`: gateway + legacy-backend + postgres (+ rabbitmq only if already in use). No new services routed yet. |

**Routes affected:** all 62 (see `route-inventory.md` summary count).
**Tables affected:** none.
**Events affected:** none.
**Data migration:** none.
**Rollback:** trivial — gateway config points everything back to legacy-backend by default; this phase doesn't remove that path.

**Done when:** frontend can point `VITE_API_URL` at the gateway and every existing endpoint still works identically.

**Stop point:** await approval before Phase 2.

---

## Phase 2 — Auth-service + users-service consumer

**Goal:** extract identity/session/JWT into auth-service; users-service exists only as
an event consumer (no HTTP yet).

Every service created in this phase (and every phase after it) follows
`service-skeleton-standard.md` for folder layout + middleware baseline + README,
`dockerfile-standard.md` for the Docker build, and takes its port from
`service-port-registry.md`. This is not repeated per-task below — it is a global rule
(see Global Rules 7–8).

| Task | Description |
|---|---|
| 2.1 | `services/auth-service/` skeleton on port `4001` (per `service-port-registry.md`): `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`. Health endpoints `GET /health/live`, `GET /health/ready` (not `/auth/health/live`). |
| 2.2 | Create `auth_schema` with `auth_identities`, `auth_sessions`, `auth_membership_projection` (empty, populated later in Phase 5), `processed_events`, `outbox_events`. `users` table's identity-relevant slice moves here structurally — no row copy (no backfill). |
| 2.3 | Add `contracts/events/auth.user_registered.v1.json` (and `auth.user_logged_in`, `auth.session_revoked` only if a confirmed consumer exists — see `event-catalog.md`). |
| 2.4 | Registration saga: `/auth/register` creates identity + writes `auth.user_registered` to auth-service's own outbox. No dependency on users-service being up; response may return minimal identity payload until Phase 3. |
| 2.5 | `services/users-service/` skeleton with `users_schema` (`users`, `user_profiles`, `processed_events`, `outbox_events`) and a consumer for `auth.user_registered` that creates a profile idempotently. **No `/users/*` HTTP routes yet.** |
| 2.6 | Confirm legacy-backend can validate JWTs issued by auth-service (same secret/verification logic) so routes not yet extracted keep working during the transition. |

**Routes affected:** `/auth/*` (5 routes) move to auth-service. `/users/*` stay on legacy for now.
**Tables affected:** `auth_identities`, `auth_sessions` (new, empty) — see `table-ownership-matrix.md`.
**Events affected:** `auth.user_registered` (new, contract-first).
**Data migration:** none — existing accounts are not preserved.
**Gateway route change:** `/auth/*` → auth-service. Everything else unchanged.
**Rollback:** route `/auth/*` back to legacy-backend.

**Done when:** register/login/refresh/logout/me work end-to-end through auth-service; `auth.user_registered` is published and consumed idempotently by users-service's consumer; legacy backend still accepts the JWT for not-yet-extracted routes.

**Stop point:** await approval before Phase 3.

---

## Phase 3 — Users-service HTTP

**Goal:** give users-service its own HTTP API and stop routing profile reads/writes through legacy.

| Task | Description |
|---|---|
| 3.1 | Add `GET /users/me`, `PATCH /users/me`, `GET /users/:id`. Decide `POST /users` per Q5 — **default: keep on legacy temporarily**, do not move it in this phase. |
| 3.2 | Update frontend: `auth/me` continues returning identity/auth status; profile reads/writes switch to `/users/me`. Confirm `frontend/src/features/profile/api/profileApi.ts` and `authApi.ts` split correctly. |
| 3.3 | Gateway routes `/users/me`, `/users/:id` to users-service. `POST /users` stays on legacy per 3.1. |

**Routes affected:** `GET /users/me`, `PATCH /users/me`, `GET /users/:id` (3 of 4 users routes).
**Tables affected:** `users_schema.users`, `user_profiles` (already created in 2.5).
**Events affected:** none new.
**Data migration:** none.
**Rollback:** route `/users/*` back to legacy.

**Done when:** profile is served entirely by users-service except `POST /users`, which stays on legacy per the Q5 decision.

**Stop point:** await approval before Phase 4.

---

## Phase 4 — Companies-service

**Goal:** extract company profile/status ownership.

| Task | Description |
|---|---|
| 4.1 | `services/companies-service/` with `POST /companies`, `GET /companies/public`, `GET /companies/me`, `GET /companies/:companyId`, `PATCH /companies/:companyId`, `GET /companies/:companyId/status-history`. |
| 4.2 | Create `companies_schema` with `companies`, `company_status_history` (new, empty — see `shared-polymorphic-table-audit.md`, do **not** write to the shared `status_history_entries` table after this phase), `processed_events`, `outbox_events`. |
| 4.3 | Add `contracts/events/company.created.v1.json`, `company.updated.v1.json` (block on schema before publishing — `company.published` only if a confirmed consumer exists per `event-catalog.md`). |
| 4.4 | Gateway: route only company-profile paths (`/companies`, `/companies/public`, `/companies/me`, `/companies/:id`, `/companies/:id/status-history`, `PATCH /companies/:id`) to companies-service. **Do not** route `/companies/:id/members/*`, `/companies/:id/services/*`, `/companies/:id/appointments/*`, `/companies/:id/specialist*`, `/companies/:id/reviews`, `/companies/:id/summary` — those stay legacy until their own phases. |

**Routes affected:** 6 company-profile routes (see `route-inventory.md`).
**Tables affected:** `companies`, plus the company slice of `status_history_entries` (per `shared-polymorphic-table-audit.md`).
**Events affected:** `company.created`, `company.updated` (new, contract-first).
**Data migration:** none.
**Rollback:** route company-profile paths back to legacy; other `/companies/*` sub-paths were never moved.

**Done when:** company create/read/update/status-history work through companies-service; no writes to shared `status_history_entries` from companies-service.

**Stop point:** await approval before Phase 5.

---

## Phase 5 — Company-members-service + auth projection

**Goal:** extract membership; give auth-service a local, eventually-consistent membership projection.

| Task | Description |
|---|---|
| 5.1 | `services/company-members-service/` with `GET /companies/:companyId/members`, `POST /companies/:companyId/members/invite` (not plain `POST /members`), `PATCH /companies/:companyId/members/:memberId`, `DELETE /companies/:companyId/members/:memberId`. |
| 5.2 | Create `company_members_schema` with `company_members`, `member_invitations`, `processed_events`, `outbox_events`. |
| 5.3 | Add `contracts/events/company-member.added.v1.json`, `company-member.removed.v1.json`, `company-member.role_changed.v1.json`. **Do not** add `company-member.suspended` — `CompanyMemberStatus` enum only has `active`/`removed` today (confirmed); adding a `suspended` event implies new business functionality. |
| 5.4 | Auth-service consumes `company-member.added/removed/role_changed`, writes to `auth_membership_projection` (created empty in Phase 2). Permission checks read this projection, not `company_members` directly. |
| 5.5 | Gateway: route `/companies/:companyId/members/*` to company-members-service. Leave all other `/companies/*` paths as previously routed. |

**Routes affected:** 4 company-members routes.
**Tables affected:** `company_members`, `member_invitations` (new, empty); `auth_membership_projection` populated via events.
**Events affected:** `company-member.added`, `.removed`, `.role_changed` (new, contract-first).
**Data migration:** none — starts empty; auth's permission checks work only for memberships created after this phase goes live.
**Rollback:** route `/companies/:companyId/members/*` back to legacy; auth-service falls back to whatever permission check it had before 5.4 (document this fallback explicitly before going live).

**Done when:** membership CRUD works through company-members-service; auth-service permission checks read the local projection with no synchronous call to company-members-service.

**Stop point:** await approval before Phase 6.

---

## Phase 6 — Specialists-service

| Task | Description |
|---|---|
| 6.1 | `services/specialists-service/`: `POST /specialists/profile`, `GET /specialists/me`, `PATCH /specialists/me`, `GET /specialists/me/status-history`, `GET /specialists/public`, `GET /specialists/:specialistId`. |
| 6.2 | Create `specialists_schema` with `specialist_profiles`, `specialist_status_history` (new, empty, per `shared-polymorphic-table-audit.md`), `processed_events`, `outbox_events`. |
| 6.3 | Add `contracts/events/specialist.created.v1.json`, `specialist.updated.v1.json` (`specialist.published` only if a confirmed consumer exists). |
| 6.4 | Gateway routes all 6 specialist routes above to specialists-service. **Do not** yet route `/specialists/me/services`, `/specialists/me/company-requests*`, `/specialists/me/companies`, `/specialists/:id/reviews` — those belong to other services (Phase 7, 8, 10). |

**Routes affected:** 6 specialist-profile routes.
**Tables affected:** `specialist_profiles`, `specialist_status_history` (new, empty).
**Events affected:** `specialist.created`, `specialist.updated`.
**Data migration:** none.
**Rollback:** route specialist-profile paths back to legacy.

**Done when:** specialist profile CRUD + status history work outside legacy, with no writes to shared `status_history_entries`.

**Stop point:** await approval before Phase 7.

---

## Phase 7 — Company-specialists-service

| Task | Description |
|---|---|
| 7.1 | `services/company-specialists-service/`: `POST /companies/:companyId/specialists/requests`, `GET /companies/:companyId/specialist-requests`, `GET /companies/:companyId/specialists`, `GET /specialists/me/company-requests`, `GET /specialists/me/companies`, `POST /specialists/me/company-requests/:requestId/accept`, `POST /specialists/me/company-requests/:requestId/reject`. |
| 7.2 | Create `company_specialists_schema` with `company_specialist_requests`, `company_specialists`, `processed_events`, `outbox_events`. |
| 7.3 | Add `contracts/events/company-specialist.accepted.v1.json`, `company-specialist.removed.v1.json` (block appointments-service's projection on these). `.requested`/`.rejected` only if a confirmed consumer exists. |
| 7.4 | Gateway routes all 7 routes above to company-specialists-service. Keep `/companies/*` generic fallback pointed at companies-service (Phase 4), unaffected. |

**Routes affected:** 7 routes.
**Tables affected:** `company_specialist_requests`, `company_specialists` (new, empty).
**Events affected:** `company-specialist.accepted`, `.removed` (contract-first, blocks Phase 9).
**Data migration:** none.
**Rollback:** route these 7 paths back to legacy.

**Done when:** company can request a specialist, specialist can accept/reject, specialist can list companies they work for — all through company-specialists-service.

**Stop point:** await approval before Phase 8.

---

## Phase 8 — Services-catalog-service

Owns both the service catalog and service-specialist assignment (Q13 default — confirm before starting if this hasn't been explicitly reconfirmed).

| Task | Description |
|---|---|
| 8.1 | Services route parity: `POST /companies/:companyId/services`, `GET /companies/:companyId/services`, `PATCH /companies/:companyId/services/:serviceId`, `GET /companies/:companyId/services/:serviceId/status-history`, `GET /services/public`, `GET /services/:serviceId`. **No `DELETE` endpoint** — does not exist today, do not add. |
| 8.2 | Service-specialists route parity: `POST /services/:serviceId/specialists`, `GET /services/:serviceId/specialists`, `DELETE /services/:serviceId/specialists/:specialistProfileId`, `GET /specialists/me/services`. |
| 8.3 | Create `services_schema` with `services`, `service_specialists`, `service_status_history` (new, empty, per `shared-polymorphic-table-audit.md`), `processed_events`, `outbox_events`. Real table names only — **not** `company_services` or `specialist_company_services`, neither exists. |
| 8.4 | Add `contracts/events/service.created.v1.json`, `service.updated.v1.json`, `specialist-service.assigned.v1.json`, `specialist-service.removed.v1.json` (block appointments-service's projection on these). **Do not** add `service.deleted` — no delete endpoint exists. |
| 8.5 | Gateway routes `/companies/:companyId/services/*`, `/services/*` (including `/services/:id/specialists`), `/specialists/me/services` to services-catalog-service. |

**Routes affected:** 10 routes across two routers.
**Tables affected:** `services`, `service_specialists`, `service_status_history` (new, empty).
**Events affected:** `service.created`, `service.updated`, `specialist-service.assigned`, `specialist-service.removed`.
**Data migration:** none.
**Rollback:** route affected paths back to legacy.

**Done when:** company can manage services and assign specialists to them outside legacy, with no writes to shared `status_history_entries`.

**Stop point:** await approval before Phase 9.

---

## Phase 9 — Appointments-service

Most sensitive domain. Only start after companies, company-members, specialists, company-specialists, and services-catalog are stable.

| Task | Description |
|---|---|
| 9.1 | Route parity — **exactly** these 7, no more: `POST /companies/:companyId/appointments`, `GET /companies/:companyId/appointments`, `PATCH /companies/:companyId/appointments/:appointmentId` (handles approve **and** reject via body), `POST /companies/:companyId/appointments/:appointmentId/complete`, `GET /appointments/me`, `GET /appointments/:appointmentId/status-history`, `POST /appointments/:appointmentId/cancel`. |
| 9.2 | **Explicitly excluded, confirmed not to exist:** `POST .../approve`, `POST .../reject` (separate endpoints), `GET /appointments/:appointmentId` (plain get-by-id), `GET /specialists/me/appointments`, `appointment.no_show` status. None of these are implemented in this phase. |
| 9.3 | Local projections (no cross-schema SQL): `appointment_company_projection`, `appointment_specialist_projection`, `appointment_service_projection`, `appointment_membership_projection` if needed — fed by `company.*`, `company-member.*`, `specialist.*`, `company-specialist.*`, `service.*` events, all of which must already have schemas from Phases 4–8. |
| 9.4 | Create `appointments_schema` with `appointments`, `appointment_status_history` (**new** table — there is no existing table with this name to rename; it is created fresh per `shared-polymorphic-table-audit.md`), `processed_events`, `outbox_events`. |
| 9.5 | Add `contracts/events/appointment.requested.v1.json` etc. — **already exist**, reuse as-is (see `event-catalog.md` implemented section); do not create v2 schemas unless the payload actually changes. |
| 9.6 | Gateway routes the 7 confirmed appointment paths to appointments-service. |

**Routes affected:** 7 routes.
**Tables affected:** `appointments`, `appointment_status_history` (new, empty).
**Events affected:** none new — reuses existing `appointment.*` schemas.
**Data migration:** none.
**Rollback:** route the 7 paths back to legacy.

**Manual happy-flow verification (no new automated tests):**

```txt
register -> login -> create company -> create specialist profile
-> company requests specialist -> specialist accepts
-> company creates service -> assigns specialist to service
-> client requests appointment -> company approves (PATCH)
-> company completes appointment
-> client, company, and specialist each see the correct appointment
```

**Done when:** the full happy flow above works through real services with no cross-schema SQL.

**Stop point:** await approval before Phase 10.

---

## Phase 10 — Reviews-service

| Task | Description |
|---|---|
| 10.1 | Confirm ownership decision (reviews-service, standalone) before starting. |
| 10.2 | `services/reviews-service/`: `POST /appointments/:appointmentId/review`, `GET /companies/:companyId/reviews`, `GET /services/:serviceId/reviews`, `GET /specialists/:specialistId/reviews`. |
| 10.3 | Create `reviews_schema` with `reviews`, `processed_events`, `outbox_events`. |
| 10.4 | `review.received` schema already exists — reuse. |
| 10.5 | Gateway routes these 4 specific paths (not a `/reviews/*` prefix — none of the real paths start with `/reviews`) to reviews-service. |

**Routes affected:** 4 routes, spread across `/appointments/*`, `/companies/*`, `/services/*`, `/specialists/*` prefixes.
**Tables affected:** `reviews` (new, empty).
**Events affected:** none new.
**Data migration:** none.
**Rollback:** route these 4 paths back to legacy.

**Stop point:** await approval before Phase 11.

---

## Phase 11 — Notifications-service cleanup

`notifications-service` already exists as a RabbitMQ consumer; it has **no HTTP API today** — building one is new work in this phase, not extraction of existing service code (the HTTP code being replaced lives in `backend`, not in `notifications-service`).

| Task | Description |
|---|---|
| 11.1 | Add HTTP layer to `notifications-service`: `GET /notifications/me`, `GET /notifications/me/unread-count`, `POST /notifications/me/read-all`, `POST /notifications/me/:notificationId/read`. Match these exact paths — earlier drafts had `POST /notifications/:notificationId/read` (missing `/me/`) and `POST /notifications/read-all` (missing `/me/`); confirmed real paths include `/me/`. |
| 11.2 | Move `notifications`, `email_logs` into `notifications_schema` (new, empty — no data migration). |
| 11.3 | Set `IN_PROCESS_NOTIFICATIONS_ENABLED=false` once notifications-service's HTTP + consumer fully replace legacy's in-process subscriber, to avoid duplicate notifications/emails. |
| 11.4 | Gateway routes `/notifications/*` to notifications-service — **only after** Task 11.1 ships. |

**Routes affected:** 4 routes.
**Tables affected:** `notifications`, `email_logs` (new, empty).
**Events affected:** none new required (consumer side already wired).
**Data migration:** none.
**Rollback:** route `/notifications/*` back to legacy; re-enable `IN_PROCESS_NOTIFICATIONS_ENABLED=true` if needed.

**Stop point:** await approval before Phase 12.

---

## Phase 12 — Backend-projection-service lifecycle

| Task | Description |
|---|---|
| 12.1 | List projection tables it writes: `appointment_recommendation_projections`, `company_insight_projections`. |
| 12.2 | Decide future owner per table (appointments-service / companies-service or read-api) — see open question in `table-ownership-matrix.md`. |
| 12.3 | Move consumers gradually once appointments-service/companies-service exist; no data migration needed (projections are derived, safe to rebuild from new events). |
| 12.4 | Retire `backend-projection-service` only after all projections have new owners. |

**Stop point:** await approval before Phase 13.

---

## Phase 13 — Observability baseline

| Task | Description |
|---|---|
| 13.1 | Every service reads `X-Request-Id` from the gateway. |
| 13.2 | Every service writes structured (JSON) logs. |
| 13.3 | Every event carries `correlationId` (envelope already has the field — ensure it's populated, not left blank). |
| 13.4 | `metrics-service` counts events per type (already observes RabbitMQ traffic — confirm per-type counters exist). |
| 13.5 | Every service has `/health/live` and `/health/ready`. |
| 13.6 | Document basic alerts: service down, queue lag, DB connection failure. |

No new tests. Can be pulled earlier (right after Phase 1) if debugging extracted services becomes difficult without it.

**Stop point:** await approval before Phase 14.

---

## Phase 14 — AI-service wiring

AI-service already exists — this phase rewires event sources, it does not recreate the service.

| Task | Description |
|---|---|
| 14.1 | Confirm `ai-service` still owns `postgres-ai` unchanged. |
| 14.2 | Confirm it validates against `contracts/events` (already does). |
| 14.3 | Consume `appointment.requested`/`.approved`/`.completed` from the new appointments-service instead of legacy. |
| 14.4 | Consume `company.*`, `specialist.*`, `service.*` from their new publishers. |
| 14.5 | Continue publishing `ai.appointment_recommendation_created`, `ai.company_insight_created`, `ai.job_failed` unchanged. |
| 14.6 | Route AI results into whichever service owns the projection per Phase 12's decision. |

Frontend never calls ai-service directly (unchanged rule).

**Stop point:** await approval before Phase 15.

---

## Phase 15 — Dashboard / BFF decision

| Task | Description |
|---|---|
| 15.1 | List `/app/summary` and `/companies/:id/summary` data dependencies (confirmed: appointments, company-members, specialists, company-specialists, companies, service-specialists repositories, all queried directly in `dashboard.service.ts`). |
| 15.2 | Keep both routes on legacy-backend until appointments/companies/users are stable in their own services. |
| 15.3 | Design read-api-service (or dashboard-service) projections once ready to extract. |
| 15.4 | Move the route only after design is confirmed. |

**Stop point:** await approval before Phase 16.

---

## Phase 16 — Decommission legacy-backend

| Task | Description |
|---|---|
| 16.1 | List remaining legacy routes (should be none, or only `POST /users` + dashboard if Phase 15 hasn't completed). |
| 16.2 | Move or delete each remaining route. |
| 16.3 | Route all gateway traffic to new services. |
| 16.4 | Disable legacy writes. |
| 16.5 | Keep legacy read-only for a rollback window. |
| 16.6 | Remove legacy backend after the rollback window closes. |

**Done when:** gateway routes no business path to legacy-backend.

---

## Final hard rules (apply throughout)

```txt
Do not add tests.
Do not add /api prefix.
Do not invent endpoints — check route-inventory.md first.
Do not invent tables — check table-ownership-matrix.md first.
Do not implement no_show.
Do not implement DELETE service endpoint.
Do not implement appointment approve/reject POST endpoints (PATCH already handles both).
Do not route /companies/* or /specialists/* as one broad gateway rule.
Do not start auth-service before Phase 0 (Tasks 0.0, 0.0b, A-E) is approved.
Do not route /notifications/* before notifications-service has HTTP endpoints (Task 11.1).
Do not publish or consume events before contracts/events schemas exist.
Do not write backfill/data-migration scripts — existing data is discarded, not migrated.
Do not keep extracted services writing to the shared status_history_entries table
  after their own phase's split (see shared-polymorphic-table-audit.md).
Do not invent a folder layout, Dockerfile pattern, or port — use
  service-skeleton-standard.md, dockerfile-standard.md, and service-port-registry.md.
Do not skip the manual smoke checklist (smoke-checklist-template.md) before a phase's
  stop point, even though no automated tests are written.
```
