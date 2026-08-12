# fill_dump_db

Seeds the main Postgres database (`docker/dev/compose.infra.yml` provisions the
same `crm` database microservices use) with realistic fake data covering every
status/enum value, plus fixed test accounts you can log in with immediately.

Talks to Postgres directly over `pg` — no dependency on any removed legacy
backend. Creates microservice schemas if they do not exist, then inserts rows
into `auth_schema`, `users_schema`, `companies_schema`, and the other
`*_schema` tables services read at runtime.

## Setup (first time only)

```bash
cd scripts/fill_dump_db
yarn install
cp .env.example .env   # defaults match compose.infra.yml local Postgres
```

## Usage

Make sure Postgres is running (`yarn dev:infra` from the repo root).

**Companies only** (quick `/companies/public` smoke test):

```bash
yarn seed:companies        # 2 published companies in companies_schema
yarn seed:companies:reset  # wipe + re-insert
```

**Full microservice seed** (every table, test login accounts):

```bash
yarn seed          # insert (fails on duplicate email/slug)
yarn seed:reset    # truncate seeded tables, then insert fresh data
```

`--reset` runs `TRUNCATE ... RESTART IDENTITY CASCADE` on every table listed in
`src/reset.ts`. **Never point this at a database you care about.**

## Test accounts

Every account uses password `Passw0rd!123` — see `src/data/credentials.ts` and
the table printed after `yarn seed`.

## What gets created

Data is wired with real foreign keys across microservice schemas so browsing via
the frontend hits connected data (companies → members → specialists → services →
appointments → reviews/notifications).

| Schema / table | Notes |
|---|---|
| `auth_schema.auth_identities` | password logins; `id` is JWT `sub` |
| `users_schema.users` + `user_profiles` | same ids as auth identities |
| `companies_schema.companies` | draft, published (×2), suspended |
| `company_members_schema.company_members` | owner/manager; active + removed |
| `specialists_schema.specialist_profiles` | draft, published, suspended |
| `company_specialists_schema.*` | requests + active relationships |
| `services_schema.*` | services, assignments, status history |
| `appointments_schema.*` | all appointment statuses |
| `reviews_schema.reviews` | two completed appointments reviewed |
| `notifications_schema.*` | all notification types + sample email logs |

Not seeded: `auth_sessions` (created by logging in), `outbox_events` (internal).
