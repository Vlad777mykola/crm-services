# Phase 15 — Dashboard / BFF Design

## 15.1 — Confirmed data dependencies

`backend/src/modules/dashboard/dashboard.service.ts` backs two routes:

**`GET /app/summary`** (any authenticated user):

| Data | Today's owner | Extracted owner |
|---|---|---|
| Unread notification count | `notifications` table | notifications-service |
| Active company memberships (+ company name/status) | `company_members` + `companies` | company-members-service + companies-service |
| Own specialist profile | `specialist_profiles` | specialists-service |
| Appointment counts by status (pending/approved/completed), for this user as client | `appointments` | appointments-service |
| If specialist: pending company-specialist requests, active company-specialist links, assigned services count | `company_specialist_requests`, `company_specialists`, `service_specialists` | company-specialists-service, services-catalog-service |

**`GET /companies/:companyId/summary`** (owner/manager only):

| Data | Today's owner | Extracted owner |
|---|---|---|
| Company record | `companies` | companies-service |
| Owner/manager permission check | `company_members` | company-members-service |
| Pending appointments count | `appointments` | appointments-service |
| Active specialists / pending specialist requests count | `company_specialists`, `company_specialist_requests` | company-specialists-service |
| Active members count | `company_members` | company-members-service |
| Service counts (total/draft/published) | `services` | services-catalog-service |

**7 distinct schemas** feed these two routes combined:
`notifications_schema`, `company_members_schema`, `companies_schema`,
`specialists_schema`, `appointments_schema`, `company_specialists_schema`,
`services_schema`. Every one of those owning services is now extracted and
stable (Phases 3-11), so the "wait until stable" condition in Task 15.2 is
now satisfied — this is the trigger to make the Task 15.3/15.4 call.

## 15.2 — Current status: still on legacy-backend

Both routes stay on `legacy-backend` for now — no gateway change made in this
pass. See "Recommendation" below for why.

## 15.3 — Design options for extracting this

### Option A — Dedicated `dashboard-service` with local projections

A new service subscribes to ~10-12 domain events (`notification.*` doesn't
exist as a domain event today - would need `notifications-service` to add
one; `company-member.*`, `company.*`, `specialist.*` (doesn't exist as a
publisher yet - see `event-catalog.md` open item), `appointment.*`,
`specialist-service.*`, `company-specialist.*`, `service.*`) and maintains
its own denormalized counters per user/company, keyed to answer exactly
these two routes cheaply (`SELECT` by primary key, not `COUNT(...) WHERE`).

- Pro: fast reads, no cross-schema queries in the hot path, matches the
  pattern already used for `appointments-service`'s four local projections
  (Phase 9) and `auth-service`'s membership projection (Phase 5).
- Con: by far the widest fan-in of any service in this system — 6-7 event
  sources, several of which (`specialist.created`/`.updated`,
  `company-specialist.*` beyond the two events that exist today,
  `notification`-related events) either don't exist yet or would need new
  contracts. Meaningful new work in `contracts/events/`, not just wiring.
- Con: two routes that are each a handful of `COUNT` queries today would
  become a service with 6-7 consumers and 2 routes - a lot of infrastructure
  for endpoints this simple.

### Option B — `dashboard-service` (or the gateway itself) does cross-schema reads directly

Same shape as the existing "legacy bridge" pattern used throughout this
migration (`legacy-company-members-bridge.ts` in 4 different services
already) — a single service with **read-only** SQL access to all 7 schemas
in the same Postgres instance, running the same `COUNT(...) WHERE` queries
`dashboard.service.ts` runs today, just against schema-qualified table names.

- Pro: near-zero design risk — it's a mechanical port of two functions that
  already exist and work today. No new event contracts, no new consumers,
  no projection-staleness concerns (dashboard counts are always live/exact).
- Pro: matches this migration's own established pattern (explicitly-flagged,
  temporary cross-schema reads) rather than inventing a new one.
- Con: it's the same "reads directly from someone else's schema" compromise
  every other service's README calls out as a known gap — just concentrated
  into one place instead of scattered. Becomes actually wrong (not just
  "a flagged compromise") the day any of these services get their own
  physical Postgres instance instead of a shared one.
- Con: doesn't reduce the total number of schemas one service depends on —
  if anything, it's the single most schema-coupled service in the whole
  architecture (7 schemas vs. every other bridge's 1-2).

### Option C — Keep on `legacy-backend` indefinitely, revisit at Phase 16

Legacy-backend already has ORM access to every one of these tables (they
haven't been dropped from its schema — no backfill policy means new writes
go to `*_schema.*` tables, but legacy's own tables/entities are untouched
throughout this migration). So `dashboard.service.ts` keeps working exactly
as-is, forever, as long as legacy-backend's own database view of these
tables is kept in sync — which it currently **is not**, once each domain's
writes moved to `*_schema.*` (e.g. new appointments created via
`appointments-service` land in `appointments_schema.appointments`, not
legacy's `appointments` table `dashboard.service.ts` reads from).

- This option is **already broken today**, not just deferred — every phase
  from 4 onward silently made the dashboard's counts stale/wrong for any
  data created after that phase's cutover, because "no backfill" means the
  two tables diverge. This was not caught by a smoke checklist because none
  of Phases 4-10's checklists included a dashboard read-back check.

## Recommendation

**Option B**, done as a small, honest continuation of this migration's
existing pattern — not because it's the target architecture, but because:

1. It's the only option that doesn't require new event contracts or new
   consumers to be designed first (Option A) or leaves a **known-broken**
   route in place (Option C, which is arguably the current actual state and
   should be flagged regardless of what happens next).
2. It correctly reflects that these two routes are aggregation/reporting
   endpoints, not a domain with a bounded context of its own — a thin
   read-only fan-out service is an honest shape for that, not a
   compromise unique to this codebase's migration approach.
3. Migrating to Option A's local projections later is not blocked by
   building Option B first — Option B's route handlers can be swapped for
   projection reads underneath the same HTTP contract without a frontend or
   gateway change, once/if the missing event contracts (`specialist.created`,
   a real `notification`-related domain event, etc.) are designed.

**This needs your sign-off before implementation** — it's the last
undecided architectural question before Phase 16 (legacy decommission), and
"read-only access to 7 schemas from one service" is a big enough footprint
that I'd rather confirm than assume. Once confirmed, Task 15.4 (move the
route) is mechanical: new `dashboard-service` (or fold into `gateway`'s
sibling `read-api-service` if you'd rather not stand up a 7th read-only
service — functionally identical either way), port the two functions above
1:1 against schema-qualified tables, wire two Traefik routes, done.
