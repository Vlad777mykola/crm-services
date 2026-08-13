# CRM Services

Monorepo with a **React frontend** and **independently deployable microservices**
behind a Traefik gateway. Services communicate through versioned event schemas
(`contracts/events/`) — never through direct source imports from other deploy
units.

## Structure

```
crm-services/
├── frontend/              # React + Vite (Yarn workspace)
├── contracts/events/      # shared event JSON schemas
├── services/              # auth, users, companies, …, dashboard, ai, workers
├── docker/                # local dev + interim prod Compose stacks
├── scripts/               # dev orchestration, verify, test, smoke, seeds
│   ├── dev/               # `yarn dev <feature>`
│   ├── verify/            # `yarn verify:startup`
│   ├── test/              # `yarn test:integration` / `test:e2e`
│   └── fill_dump_db/      # `yarn db:migrate` / `yarn db:seed`
└── docs/architecture/     # extraction checklist, routing, ownership
```

Yarn workspaces: `frontend`, `services/*`, `scripts/fill_dump_db`.

## Getting started

Requires **Node.js >= 22.13** and **Docker** (for Postgres, RabbitMQ, Traefik).

```bash
yarn install              # all workspaces
yarn dev                  # default: companies (frontend + companies-service)
# or: yarn dev dashboard --fresh
```

Infra starts automatically. Manual infra only: `yarn dev:infra` (Postgres `:5432`, gateway `:8080`).

Gateway: `http://localhost:8080` · Frontend: `http://localhost:5173`

See [`scripts/dev/README.md`](scripts/dev/README.md) for features, `yarn dev stop`, and DB commands.

### Database (migrate / backup / seed / baseline)

```bash
yarn db:migrate --target dev
yarn db:backup --target dev
yarn db:restore --target dev --file db/backups/my.dump
yarn db:baseline:pull && yarn db:baseline:restore --target dev
yarn dev dashboard --fresh      # deterministic reset + seed
```

Profiles: `db:seed:companies`, `db:seed:full`, `db:seed:test`. See [`scripts/db/README.md`](scripts/db/README.md).

## Root scripts

| Script                            | Purpose                          |
| --------------------------------- | -------------------------------- |
| `yarn dev` / `yarn dev <feature>` | Intent-based local dev           |
| `yarn dev list`                   | Features and dependencies        |
| `yarn verify:startup`             | Isolated startup gate (CI)       |
| `yarn test`                       | Unit tests (frontend + services) |
| `yarn test:integration`           | Isolated integration stack       |
| `yarn test:e2e`                   | E2E smoke on test ports          |
| `yarn smoke:prod`                 | Prod Dockerfile smoke            |
| `yarn build/lint/typecheck`       | Frontend                         |

## Architecture docs

- [`docs/architecture/microservices-extraction-checklist.md`](docs/architecture/microservices-extraction-checklist.md)
- [`docs/architecture/dev-orchestration.md`](docs/architecture/dev-orchestration.md)
- [`docs/architecture/gateway-routing.md`](docs/architecture/gateway-routing.md)
- [`scripts/README.md`](scripts/README.md) — dev, verify, test, smoke
- [`docker/dev/README.md`](docker/dev/README.md)

how to run will need update
Here is a practical **local, one-by-one** workflow to bring everything up, see what breaks, and narrow it down.

## 0. One-time setup

From repo root:

```powershell
cd D:\projects\crm-services
yarn install
yarn dev check
```

Copy env files if you have not already (each service needs its `.env`):

```powershell
# examples — repeat for services you test
copy services\auth-service\.env.example services\auth-service\.env
copy services\users-service\.env.example services\users-service\.env
copy services\ai-service\.env.example services\ai-service\.env
copy services\outbox-publisher\.env.example services\outbox-publisher\.env
```

---

## 1. Start infrastructure (always first)

```powershell
yarn dev:infra
```

This starts **Postgres :5432**, **RabbitMQ**, **Traefik :8080**.

For **AI + postgres-ai** (only when testing AI/outbox-publisher-ai):

```powershell
docker compose -f docker/dev/compose.infra.yml --profile python-workers up -d postgres-ai
```

**Sanity checks:**

```powershell
# Postgres
docker compose -f docker/dev/compose.infra.yml ps

# RabbitMQ management UI (browser)
# http://localhost:15672  (user/pass from compose — usually crm / crm_local_only)

# Gateway
curl http://localhost:8080/ping
```

---

## 2. Prepare DB (fresh start recommended)

For a clean slate while debugging:

```powershell
yarn db:migrate --target dev
yarn db:reset --target dev
yarn db:seed:full --target dev
```

Or let a feature do it:

```powershell
yarn dev auth --fresh
```

---

## 3. Two strategies

### Strategy A — **Incremental (best for finding problems)**

Start **one layer at a time**. After each layer, run the health checks in section 4 before moving on.

Use **separate terminals** (or `yarn dev svc` / `yarn dev outbox` to run a small group).

#### Layer 1 — Auth chain (register/login + user profile consumer)

**Terminal 1:**

```powershell
yarn dev svc auth users
```

**Terminal 2:**

```powershell
yarn dev outbox auth
```

**Test:**

```powershell
curl http://localhost:4001/health/ready
curl http://localhost:4002/health/ready
curl http://localhost:4501/health/ready
```

Smoke: register a user via gateway (or auth directly) and confirm `users-service` creates a profile (check logs).

---

#### Layer 2 — Companies + members

**Terminal 3:**

```powershell
yarn dev svc companies company-members
```

**Terminal 4:**

```powershell
yarn dev outbox companies company-members
```

**Test:**

```powershell
curl http://localhost:4003/health/ready
curl http://localhost:4004/health/ready
curl http://localhost:4503/health/ready
curl http://localhost:4504/health/ready
```

---

#### Layer 3 — Specialists + catalog

```powershell
yarn dev svc specialists company-specialists services-catalog
yarn dev outbox specialists company-specialists services-catalog
```

Ports: **4005, 4006, 4007** and outboxes **4505–4507**.

---

#### Layer 4 — Appointments + reviews

```powershell
yarn dev svc appointments reviews
yarn dev outbox appointments reviews
```

Ports: **4008, 4009** and outboxes **4508–4509**.

---

#### Layer 5 — Notifications (consumer)

```powershell
yarn dev svc notifications
```

Port: **4300** (uses `HEALTH_PORT`, not `PORT`).

---

#### Layer 6 — Dashboard

```powershell
yarn dev svc dashboard
```

Port: **4010**. Needs auth token for `/app/summary`.

---

#### Layer 7 — AI + metrics (not in `yarn dev full`)

**Metrics** (observer, no DB inbox):

```powershell
cd services\metrics-service
yarn dev
```

```powershell
curl http://localhost:4100/health/ready
```

**AI service** (needs `postgres-ai` + RabbitMQ):

```powershell
cd services\ai-service
# ensure .env has AI_DATABASE_URL=postgres://ai:ai_password@localhost:5433/ai
python src/main.py
```

```powershell
curl http://localhost:4200/health/ready
```

**AI outbox publisher** (when testing `MESSAGING_MODE=outbox`):

```powershell
cd services\outbox-publisher
$env:DATABASE_URL="postgres://ai:ai_password@localhost:5433/ai"
$env:OUTBOX_SCHEMA="ai_schema"
$env:HEALTH_PORT="4510"
yarn dev
```

```powershell
curl http://localhost:4510/health/ready
```

---

#### Layer 8 — Frontend (optional UI testing)

```powershell
yarn workspace @crm/frontend dev
```

Open: **http://localhost:5173**  
API via gateway: **http://localhost:8080**

---

### Strategy B — **Start almost everything at once**

```powershell
yarn dev full --fresh
```

Starts: 11 domain services + 9 outbox publishers + frontend.  
Does **not** include: `metrics-service`, `ai-service`, `outbox-publisher-ai`.

Then add AI/metrics manually (layer 7) if needed.

---

## 4. Health check cheat sheet

| Component           | Ready URL                                        |
| ------------------- | ------------------------------------------------ |
| auth                | `http://localhost:4001/health/ready`             |
| users               | `http://localhost:4002/health/ready`             |
| companies           | `http://localhost:4003/health/ready`             |
| company-members     | `http://localhost:4004/health/ready`             |
| specialists         | `http://localhost:4005/health/ready`             |
| company-specialists | `http://localhost:4006/health/ready`             |
| services-catalog    | `http://localhost:4007/health/ready`             |
| appointments        | `http://localhost:4008/health/ready`             |
| reviews             | `http://localhost:4009/health/ready`             |
| dashboard           | `http://localhost:4010/health/ready`             |
| metrics             | `http://localhost:4100/health/ready`             |
| ai                  | `http://localhost:4200/health/ready`             |
| notifications       | `http://localhost:4300/health/ready`             |
| outbox auth…reviews | `http://localhost:4501` … `4509` `/health/ready` |
| outbox ai           | `http://localhost:4510/health/ready`             |
| gateway             | `http://localhost:8080/ping`                     |
| frontend            | `http://localhost:5173`                          |

PowerShell helper:

```powershell
function Test-Service($name, $port) {
  try {
    $r = Invoke-WebRequest "http://localhost:$port/health/ready" -UseBasicParsing
    Write-Host "OK  $name :$port" -ForegroundColor Green
  } catch {
    Write-Host "FAIL $name :$port" -ForegroundColor Red
  }
}

4001,4002,4003,4004,4005,4006,4007,4008,4009,4010,4100,4200,4300,4501,4502,4503,4504,4505,4506,4507,4508,4509,4510 | ForEach-Object {
  Test-Service "port" $_
}
```

---

## 5. Messaging-specific checks (after services are up)

```powershell
# Contract / routing CI
yarn ci:validate-events

# Outbox publisher unit tests
yarn workspace @crm/outbox-publisher test

# Users inbox transaction tests (needs Postgres + users_schema)
$env:USERS_INTEGRATION_TEST="1"
$env:DATABASE_URL="postgres://postgres:postgres@localhost:5432/crm"
yarn workspace @crm/users-service test

# Combined messaging harness
yarn test:messaging

# DLQ / queue depths (RabbitMQ must be up)
yarn messaging:dlq:list
```

---

## 6. When something fails — where to look

| Symptom                        | Likely cause                                          | What to check                                            |
| ------------------------------ | ----------------------------------------------------- | -------------------------------------------------------- |
| `/health/ready` → 503          | DB or Rabbit down                                     | Service terminal logs; `docker compose ... ps`           |
| Port already in use            | Old process still running                             | `yarn dev status` then `yarn dev stop`                   |
| Outbox publisher waits forever | Owning service not started / no `outbox_events` table | Start the service first (it creates schema on boot)      |
| Events not flowing             | Missing outbox publisher for that schema              | Match service → outbox (auth→4501, companies→4503, etc.) |
| AI not working                 | `postgres-ai` not running                             | `--profile python-workers`                               |
| Consumer errors                | Rabbit binding / handler exception                    | Service logs + RabbitMQ queue depth in UI                |

**Useful commands:**

```powershell
yarn dev status          # tracked PIDs + ports
yarn dev stop            # stop app processes
yarn dev stop --infra    # also stop Docker infra

yarn dev list            # all features and what they start
```

**RabbitMQ UI:** http://localhost:15672 — check queue depths (`users-service.q`, retry/parking queues, dead queues).

---

## 7. Recommended debug order (matches event flow)

```text
1. infra (postgres + rabbit + traefik)
2. auth + outbox-auth + users
3. companies + outbox-companies + company-members + outbox-company-members
4. specialists → catalog → appointments → reviews (+ their outboxes)
5. notifications
6. dashboard
7. ai + outbox-publisher-ai + metrics
8. frontend
```

Stop after the **first layer that fails** readiness or logs errors — fix that before continuing.

---

## 8. Full automated boot check (optional)

Isolated from dev ports — proves everything can start in Docker:

```powershell
yarn verify:startup
```

Uses verify ports (`:25432`, `:25672`, etc.), not your dev `:5432`.

---

If you want, paste output from `yarn dev check`, then layer 1 health curls, and we can pinpoint the first failing service together.

You’re hitting two separate issues. Here’s what’s going on and how to fix it.

What’s wrong

1. Wrong seed profile (most common)
   If you used yarn dev companies or yarn db:seed:companies, you only get 2 published companies — no specialists, no services, no appointments.

For booking you need the full seed:

Profile Companies Specialists Services Appointments
companies / companies:reset
2 published
❌
❌
❌
full / full:reset
4 (2 published)
✅ 5
✅ 7
✅ 7 2. Missing appointments projections (bug in seed — now fixed)
Even with full seed, appointments-service does not read services_schema directly. It reads projection tables that are normally filled by RabbitMQ events:

appointment_service_projection
appointment_service_specialist_projection
appointment_membership_projection
The seed wrote source data but not projections → booking fails with “Service not found” and specialist lists can look empty.

I added projection rows to scripts/fill_dump_db/src/seed.ts so full seed is self-contained.

Fix your local DB

# 1. Stop running dev apps

yarn dev stop --force-ports

# 2. Full reset + full seed (not companies-only!)

yarn db:migrate --target dev
yarn db:reset --target dev
yarn db:seed:full --target dev
Or in one step when starting dev:

yarn dev stop --force-ports
yarn dev full --fresh
Start services needed for company + specialists + services + booking
yarn dev:infra

# Terminal 1 — core booking chain

yarn dev svc auth users companies company-members specialists company-specialists services-catalog appointments reviews notifications dashboard

# Terminal 2 — outbox publishers for those schemas

yarn dev outbox auth companies company-members specialists company-specialists services-catalog appointments reviews
Or:

yarn dev full
Test accounts (password: Passw0rd!123)
Login Use for
owner.dental@example.com
Manage Bright Smile Dental — see Olena specialist, Teeth Cleaning / Whitening
owner.beauty@example.com
Manage Glow Beauty Studio — see Nina, Haircut / Manicure
client.andriy@example.com
Book an appointment as client
specialist.olena@example.com
Specialist at dental company
Bookable companies:

Bright Smile Dental (bright-smile-dental) — specialist Olena, services: Teeth Cleaning, Teeth Whitening
Glow Beauty Studio (glow-beauty-studio) — specialist Nina, services: Haircut & Styling, Manicure
Quick DB sanity check (optional)
In psql or any SQL client on crm:

-- Should return 4 published services
SELECT name, status FROM services_schema.services WHERE status = 'published';
-- Should return 2 active company specialists
SELECT cs.status, sp."displayName", c.name
FROM company_specialists_schema.company_specialists cs
JOIN specialists_schema.specialist_profiles sp ON sp.id = cs."specialistProfileId"
JOIN companies_schema.companies c ON c.id = cs."companyId"
WHERE cs.status = 'active';
-- After re-seed with the fix — should match published services
SELECT _ FROM appointments_schema.appointment_service_projection;
SELECT _ FROM appointments_schema.appointment_service_specialist_projection;
If the last two queries are empty after full:reset, you’re on old seed — run yarn db:seed:full:reset --target dev again.

UI flow to test booking
Log in as client.andriy@example.com / Passw0rd!123
Open Services → pick Teeth Cleaning (Bright Smile Dental)
Book appointment
Log in as owner.dental@example.com to approve it under company appointments
If specialists still don’t show on the company management page, log in as the company owner (owner.dental@...) and open that company’s specialists/services tabs — not the public companies list.

Run the reseed and tell me which page you’re on (company admin vs public booking) if it’s still empty.

$ yarn dev full --fresh

yarn run v1.22.22

$ node scripts/dev/run.mjs full --fresh

Local environment

✓ Node v22.13.1

✓ dependencies installed

✓ Docker available

Static prerequisites OK (infra not required for check).

[dev] ensuring dev infrastructure (postgres, rabbitmq, traefik)…

[+] up 4/4

✔ Container dev-postgres-1 Healthy 0.6s ✔ Container dev-redis-1 Healthy 0.6s ✔ Container dev-rabbitmq-1 Healthy 0.7s ✔ Container dev-gateway-1 Healthy 0.6s✓ Postgres, RabbitMQ, Traefik healthy

[dev] --fresh: migrate → reset → seed

Database operation

Action: MIGRATE

Target: dev

Host: localhost

Port: 5432

Database: crm

$ tsx src/migrate-only.ts

[db:migrate] schemas applied

Database operation

Action: RESET

Target: dev

Host: localhost

Port: 5432

Database: crm

$ tsx src/reset-only.ts

[fill_dump_db] truncated 40 application table(s)

[fill_dump_db] verified 40 table(s) empty

[db:reset] truncate complete

[state] RabbitMQ vhost crm-dev not found — skipping purge

[db:reset] complete

Database operation

Action: SEED full

Target: dev

Host: localhost

Port: 5432

Database: crm

$ tsx src/index.ts

[fill_dump_db] created 15 users

[fill_dump_db] created 4 companies (draft, published x2, suspended)

[fill_dump_db] created 6 company members

[fill_dump_db] created 5 auth membership projections

[fill_dump_db] created 5 specialist profiles (draft, published x3, suspended)

[fill_dump_db] created 7 company specialist requests (pending, accepted x4, rejected, cancelled)

[fill_dump_db] created 4 company specialists (active x2, paused, removed)

[fill_dump_db] created 7 services (draft x2, published x4, suspended)

[fill_dump_db] created 4 service specialist assignments

[fill_dump_db] failed: error: column "id" of relation "appointment_company_projection" does not exist

    at D:\projects\crm-services\node_modules\pg-pool\index.js:45:11

    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)

    at async query (D:\projects\crm-services\scripts\fill_dump_db\src\db.ts:14:18)

    at async insertQualified (D:\projects\crm-services\scripts\fill_dump_db\src\insert.ts:45:3)

    at async seedDatabase (D:\projects\crm-services\scripts\fill_dump_db\src\seed.ts:392:3)

    at async main (D:\projects\crm-services\scripts\fill_dump_db\src\index.ts:24:3) {

length: 145,

severity: 'ERROR',

code: '42703',

detail: undefined,

hint: undefined,

position: '90',

internalPosition: undefined,

internalQuery: undefined,

where: undefined,

schema: undefined,

table: undefined,

column: undefined,

dataType: undefined,

constraint: undefined,

file: 'parse_target.c',

line: '1066',

routine: 'checkInsertTargets'

}

error Command failed with exit code 1.

info Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.

error Command failed.

Exit code: 1

Command: C:\Program Files\nodejs\node.exe

Arguments: C:\Users\vlad7\AppData\Roaming\nvm\v22.13.1\node_modules\yarn\lib\cli.js run seed

Directory: D:\projects\crm-services\scripts\fill_dump_db

Output:

info Visit https://yarnpkg.com/en/docs/cli/workspace for documentation about this command.

node:internal/errors:983

const err = new Error(message);

              ^

Error: Command failed: yarn workspace @crm/fill-dump-db run seed

    at genericNodeError (node:internal/errors:983:15)

    at wrappedFn (node:internal/errors:537:14)

    at checkExecSyncError (node:child_process:882:11)

    at execSync (node:child_process:954:15)

    at runSeed (file:///D:/projects/crm-services/scripts/db/seed.mjs:56:3)

    at file:///D:/projects/crm-services/scripts/db/seed.mjs:73:9

    at ModuleJob.run (node:internal/modules/esm/module_job:271:25)

    at async onImport.tracePromise.__proto__ (node:internal/modules/esm/loader:547:26)

    at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:116:5) {

status: 1,

signal: null,

output: [ null, null, null ],

pid: 20648,

stdout: null,

stderr: null

}

Node.js v22.13.1

[dev] failed: Error: Command failed: node scripts/db/seed.mjs full --target dev

    at genericNodeError (node:internal/errors:983:15)

    at wrappedFn (node:internal/errors:537:14)

    at checkExecSyncError (node:child_process:882:11)

    at execSync (node:child_process:954:15)

    at runFeature (file:///D:/projects/crm-services/scripts/dev/run.mjs:231:5)

    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)

    at async main (file:///D:/projects/crm-services/scripts/dev/run.mjs:313:5) {

status: 1,

signal: null,

output: [ null, null, null ],

pid: 12876,

stdout: null,

stderr: null

}

error Command failed with exit code 1.

info Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.

The seed failed because insertQualified auto-adds an id column, but projection tables use composite or non-id primary keys. Checking the insert helper and fixing the projection inserts.

The failure was because insertQualified always adds an id column, but projection tables use natural keys (companyId, serviceId, composite PKs) — not id.

I switched those inserts to insertRow, which only writes the columns you pass.

Retry
Your DB was reset but seed failed partway, so run a full fresh cycle again:

yarn dev stop --force-ports
yarn dev full --fresh
You should see this line near the end of the seed output:

[fill_dump_db] created appointments-service projections (companies, memberships, services, assignments)
…and then the rest of appointments/reviews/notifications seeding.

If you only want to re-run seed (infra already up)
yarn dev stop --force-ports
yarn db:seed:full:reset --target dev
yarn dev full
(full:reset truncates and seeds; yarn dev full starts services without another reset.)

Paste the seed output if anything else fails.
