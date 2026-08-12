# fill_dump_db

Seeds the main database (`backend`'s Postgres - the same one
`docker/dev/compose.infra.yml` provisions) with realistic fake data that exercises
every status/enum value on every table, plus a fixed set of test accounts you can
log in with immediately.

Talks to Postgres directly over `pg` - it does **not** go through the backend's
TypeORM setup or its `@/` path aliases, so it has no dependency on the backend
workspace and will run against any environment's `DATABASE_URL` (local, CI, a
throwaway container, etc).

## Setup (first time only)

```bash
cd scripts/fill_dump_db
yarn install
cp .env.example .env   # defaults already match compose.infra.yml's local Postgres
```

## Usage

Make sure Postgres is running and the backend has already run its migrations at least
once (`yarn workspace @crm/backend migration:run`, or just start the backend once with
`NODE_ENV=development` so TypeORM's `synchronize` creates the tables) - this script only
inserts rows, it never creates tables.

```bash
yarn seed          # insert fake data (fails if it collides with existing rows, e.g. same email)
yarn seed:reset    # wipe every table this script touches, then insert fresh fake data
```

`--reset` runs `TRUNCATE ... RESTART IDENTITY CASCADE` on every table listed in
`src/reset.ts` first. **Never point this at a database you care about** - it deletes
everything in those tables, no confirmation prompt.

## Test accounts

Every account below uses the same password:

```
Passw0rd!123
```

| Email | Role / company |
|---|---|
| `owner.dental@example.com` | Owner - Bright Smile Dental (published company) |
| `manager.dental@example.com` | Manager - Bright Smile Dental |
| `owner.beauty@example.com` | Owner - Glow Beauty Studio (published, remote-supported company) |
| `member.beauty.removed@example.com` | Former manager (membership removed) - Glow Beauty Studio |
| `owner.fitness@example.com` | Owner - Fresh Start Fitness (draft company, not published yet) |
| `owner.spa@example.com` | Owner - Old Town Spa (suspended company) |
| `specialist.olena@example.com` | Specialist - published profile, active at Bright Smile Dental |
| `specialist.ihor@example.com` | Specialist - published profile; pending request to Bright Smile Dental, rejected by Old Town Spa |
| `specialist.nina@example.com` | Specialist - published profile, active at Glow Beauty Studio |
| `specialist.pavlo@example.com` | Specialist - draft profile (not published); cancelled own request to Fresh Start Fitness |
| `specialist.kate@example.com` | Specialist - suspended profile; paused at Glow Beauty Studio, removed from Bright Smile Dental |
| `client.andriy@example.com` | Client - pending, cancelled, and completed-but-unreviewed appointments |
| `client.iryna@example.com` | Client - approved appointment + a completed & reviewed appointment |
| `client.taras@example.com` | Client - rejected appointment + a completed & reviewed appointment |
| `client.disabled@example.com` | Client - account status is `disabled`; login must be rejected (403) |

This same table is also the single source of truth in code - see
[`src/data/credentials.ts`](src/data/credentials.ts) - and gets reprinted to your
terminal every time you run `yarn seed`.

## What gets created

Everything below is wired together with real foreign keys (companies → members →
specialists → services → appointments → reviews/notifications), so browsing any of the
accounts above through the frontend hits real, connected data instead of empty states.

| Table | Rows | Covers |
|---|---|---|
| `users` / `auth_identities` | 15 | `active` + `disabled` user status |
| `companies` | 4 | `draft`, `published` (x2, one remote-supported), `suspended` |
| `company_members` | 6 | `owner` + `manager` roles; `active` + `removed` status |
| `specialist_profiles` | 5 | `draft`, `published` (x3), `suspended` |
| `company_specialist_requests` | 7 | `pending`, `accepted` (x4), `rejected`, `cancelled` |
| `company_specialists` | 4 | `active` (x2), `paused`, `removed` |
| `services` | 7 | `draft` (x2), `published` (x4), `suspended` |
| `service_specialists` | 4 | links published services to their active specialist |
| `appointments` | 7 | `pending`, `approved`, `rejected`, `cancelled`, `completed` (x3: 2 reviewed, 1 not) |
| `status_history_entries` | 11 | all 4 `AuditEntityType` values (`appointment`, `company`, `service`, `specialist_profile`) |
| `reviews` | 2 | one 5-star, one 4-star, each tied to a completed appointment |
| `notifications` | 7 | all 7 `NotificationType` values, mix of read/unread |
| `email_logs` | 4 | simulated sends matching a few of the notifications above |

Not seeded: `auth_sessions` (created by actually logging in), `outbox_events` /
`migrations` (internal bookkeeping with no read path - seeding fake rows there would
just confuse `services/outbox-publisher`).
