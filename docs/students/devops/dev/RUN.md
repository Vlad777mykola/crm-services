# Dev — how to run

## Current status

**CURRENT VERIFIED** — `yarn dev` and related scripts from `scripts/dev/`.

**Prerequisites:** read [../README.md](../README.md) (concepts and dependencies).

---

## Step 0 — one-time setup

```powershell
cd D:\projects\crm-services
yarn install
yarn dev check
```

`yarn install` links workspace packages including `@crm/messaging-kit` (`services/messaging-kit/`). Consumers import it at dev time via Yarn workspaces — no separate build step unless you run outside the monorepo layout.

**Expected output:**

```text
✓ Node v22.x.x
✓ dependencies installed
✓ Docker available
Static prerequisites OK
```

Copy env files for services you will run:

```powershell
copy services\auth-service\.env.example services\auth-service\.env
copy services\users-service\.env.example services\users-service\.env
copy services\companies-service\.env.example services\companies-service\.env
# add more as you start more services
```

---

## Step 1 — minimal dev (companies list + UI)

**Goal:** See the frontend and public companies API with the smallest possible stack.

```powershell
yarn dev
```

Same as `yarn dev companies`.

**What starts:**

| Process | Port | Why needed |
| ------- | ---- | ---------- |
| Postgres, RabbitMQ, Traefik | 5432, 5672, 8080 | Infra layer |
| companies-service | 4003 | Serves `/companies/public` |
| Frontend (Vite) | 5173 | Browser UI |

**Success output:**

```text
✓ Postgres, RabbitMQ, Traefik healthy
✓ companies :4003
✓ frontend :5173

http://localhost:5173
API: http://localhost:8080
```

**Verify:**

```powershell
curl http://localhost:8080/ping
curl http://localhost:4003/health/ready
curl http://localhost:8080/companies/public
```

Open **http://localhost:5173** in the browser.

**Seed note:** default feature uses `companies:reset` seed only when you pass `--fresh`. Without `--fresh`, existing DB data is kept.

---

## Step 2 — auth flow (register / login)

**Goal:** User registration creates a profile via RabbitMQ events.

```powershell
yarn dev auth --fresh
```

**What starts:** frontend + auth (:4001) + users (:4002) + outbox-auth (:4501).

**Why `--fresh`:** seeds full test users and resets stale state.

**Verify:**

```powershell
curl http://localhost:4001/health/ready
curl http://localhost:4002/health/ready
curl http://localhost:4501/health/ready
```

Register a user in the UI or via gateway `POST /auth/register`.

---

## Step 3 — dashboard

```powershell
yarn dev dashboard --fresh
```

Starts auth chain + dashboard (:4010) and migrates cross-schema dependencies.

---

## Step 4 — full dev (booking, specialists, appointments)

**Goal:** Entire product flow except AI/metrics.

```powershell
yarn dev stop --force-ports
yarn dev full --fresh
```

**What starts:**

- 11 domain services (auth through notifications + dashboard)
- 9 outbox publishers (:4501–:4509)
- Frontend

**NOT included** (manual start if needed):

- metrics-service (:4100)
- ai-service (:4200) — needs `postgres-ai` profile
- AI outbox (:4510)

**Full seed success lines:**

```text
[fill_dump_db] created 15 users
[fill_dump_db] created 4 companies ...
[fill_dump_db] created 7 services ...
[fill_dump_db] created appointments-service projections ...
```

**Test accounts** (password `Passw0rd!123`):

| Email | Role |
| ----- | ---- |
| `client.andriy@example.com` | Book appointments |
| `owner.dental@example.com` | Manage Bright Smile Dental |
| `owner.beauty@example.com` | Manage Glow Beauty Studio |

---

## Step 5 — incremental dev (learn dependencies)

**Goal:** Understand what depends on what by starting one layer at a time.

**Terminal 1 — infra only:**

```powershell
yarn dev:infra
```

**Then layers** (separate terminals):

```powershell
# Layer 1
yarn dev svc auth users
yarn dev outbox auth

# Layer 2
yarn dev svc companies company-members
yarn dev outbox companies company-members

# Layer 3
yarn dev svc specialists company-specialists services-catalog
yarn dev outbox specialists company-specialists services-catalog

# Layer 4
yarn dev svc appointments reviews
yarn dev outbox appointments reviews

# Layer 5
yarn dev svc notifications

# Layer 6
yarn dev svc dashboard

# Layer 7 (optional)
cd services\metrics-service && yarn dev
# AI: see docker/dev/README.md (postgres-ai profile)
```

**Frontend separately:**

```powershell
yarn workspace @crm/frontend dev
# VITE_API_URL must be http://localhost:8080 (yarn dev sets this automatically)
```

Stop after the first layer that fails — fix before continuing. See [DEBUG.md](./DEBUG.md).

---

## Feature reference

```powershell
yarn dev list
```

| Feature | What runs | Seed with `--fresh` |
| ------- | --------- | ------------------- |
| `companies` (default) | frontend + companies | `companies:reset` (2 companies) |
| `auth` | frontend + auth + users + outbox-auth | `full` |
| `companies-members` | companies + members + outbox-companies | `full` |
| `dashboard` | auth chain + dashboard | `full` |
| `core` | auth + companies + dashboard | `full` |
| `full` | all services + outboxes + frontend | `full` |

### Useful flags

```powershell
yarn dev dashboard --fresh       # migrate → reset → seed → start
yarn dev dashboard --baseline    # restore team baseline dump → start
yarn dev companies --no-frontend # skip UI if :5173 already running
yarn dev auth --no-infra         # skip Docker (infra already up)
```

---

## Port map

| Service | Port | Gateway path (examples) |
| ------- | ---- | ----------------------- |
| gateway | 8080 | all API traffic |
| auth | 4001 | `/auth/*` |
| users | 4002 | `/users/*` |
| companies | 4003 | `/companies/*` |
| company-members | 4004 | `/companies/:id/members*` |
| specialists | 4005 | `/specialists/*` |
| company-specialists | 4006 | company specialist routes |
| services-catalog | 4007 | `/services/*` |
| appointments | 4008 | `/appointments/*` |
| reviews | 4009 | review routes |
| dashboard | 4010 | `/app/summary` |
| notifications | 4300 | `/notifications/*` |
| outbox auth…reviews | 4501–4509 | health only |
| frontend | 5173 | browser UI |

---

## Database commands (dev)

```powershell
yarn db:migrate --target dev
yarn db:reset --target dev
yarn db:seed:companies --target dev      # 2 companies only
yarn db:seed:full:reset --target dev     # full booking scenario
yarn db:backup --target dev
yarn db:restore --target dev --file db/backups/my.dump
```

**Important:** booking flows need `full` seed, not `companies` only.

---

## Stop and status

```powershell
yarn dev status              # tracked PIDs + ports
yarn dev stop                # stop app processes
yarn dev stop --infra        # also stop Docker infra
yarn dev stop --force-ports  # kill processes on dev ports
```

---

## Health check cheat sheet

| URL | Expected |
| --- | -------- |
| `http://localhost:8080/ping` | 200 |
| `http://localhost:<port>/health/ready` | 200 |
| `http://localhost:5173` | HTML loads |
| `http://localhost:15672` | RabbitMQ UI (`crm` / `crm_local_only`) |

PowerShell batch check:

```powershell
4001,4002,4003,4004,4005,4006,4007,4008,4009,4010,4300,4501,4502,4503,4504,4505,4506,4507,4508,4509 | ForEach-Object {
  try { Invoke-WebRequest "http://localhost:$_/health/ready" -UseBasicParsing | Out-Null; "OK $_" }
  catch { "FAIL $_" }
}
```

---

## When something breaks

→ [DEBUG.md](./DEBUG.md)

---

## Related repo docs

- [../../scripts/dev/README.md](../../../scripts/dev/README.md)
- [../../docker/dev/README.md](../../../docker/dev/README.md)
- [../../scripts/db/README.md](../../../scripts/db/README.md)
- [../README.md](../README.md)
