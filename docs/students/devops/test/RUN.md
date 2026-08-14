# Test — how to run

## Current status

**CURRENT VERIFIED** — `yarn test:*` scripts from `scripts/test/` and `.github/workflows/repo-ci.yml`.

**Prerequisites:** [../README.md](../README.md), dev working ([../dev/RUN.md](../dev/RUN.md)).

---

## Why tests are split into layers

| Layer | Command | Docker? | Speed | Proves |
| ----- | ------- | ------- | ----- | ------ |
| Unit | `yarn test` | No | Fast | Logic in one package |
| Integration | `yarn test:integration` | Yes (isolated) | Medium | Service + DB + gateway |
| E2E | `yarn test:e2e` | Yes (isolated) | Slower | + CORS + frontend |
| Verify | `yarn verify:startup` | Yes (isolated) | Slowest | Every component boots |
| Architecture | `yarn verify:architecture` | No | Fast | Lint + messaging rules |
| Smoke | `yarn smoke:prod` | Yes (isolated) | Medium | Prod Dockerfile works |

**Important:** test/verify/smoke stacks use **different ports** than dev — they won't touch your `:5432` database.

---

## Port isolation

| Resource | Dev | Test | Verify | Smoke |
| -------- | --- | ---- | ------ | ----- |
| Postgres | 5432 | **15432** | 25432 | 35432 |
| Gateway | 8080 | **18080** | 28080 | 38080 |
| Frontend | 5173 | **25173** | 15173 | — |
| companies | 4003 | **24003** | 14003 | container |
| Docker project | `dev` | **crm-test** | crm-verify | crm-smoke |

App ports in test = dev port + **20000**.

---

## Step 1 — unit tests (start here)

**Goal:** Fast feedback on business logic — no Docker required.

```powershell
yarn test
# same as:
yarn test:unit
```

**What runs:**

1. `yarn workspace @crm/frontend test` (Vitest)
2. Each `services/*` package that defines a `test` script

**Success:**

```text
[test:unit] auth-service
…
[test:unit] done
```

Exit code `0`.

**Run one package:**

```powershell
cd services\companies-service
yarn test

yarn workspace @crm/frontend test
```

---

## Step 2 — integration tests

**Goal:** Prove companies-service works with real Postgres and gateway on an isolated stack.

```powershell
yarn test:integration
```

**Automatic flow:**

1. Start `crm-test` stack (`docker/test/compose.yml`)
2. Migrate test DB on `:15432`
3. Seed test companies
4. Spawn `companies-service` on `:24003`
5. `GET http://localhost:18080/companies/public` → expect ≥1 company
6. Tear down (`docker compose … down -v`)

**Success:**

```text
[test:integration] GET /companies/public → N companies (Bright Smile Dental, …)
[test:integration] passed
```

**Manual stack (leave running to inspect):**

```powershell
docker compose -p crm-test -f docker/test/compose.yml up -d --wait
curl http://localhost:18080/ping
docker compose -p crm-test -f docker/test/compose.yml down -v --remove-orphans
```

---

## Step 3 — E2E tests

**Goal:** Integration checks plus CORS and frontend dev server.

```powershell
yarn test:e2e
```

**Additional checks vs integration:**

- Full test fixtures seed (≥2 published companies)
- `OPTIONS` CORS from `http://localhost:25173`
- Frontend reachable on `:25173`

**Success:**

```text
[test:e2e] /companies/public → N companies
[test:e2e] gateway CORS for test frontend OK
[test:e2e] passed
```

---

## Step 4 — verify startup (CI gate)

**Goal:** Prove every runnable component can boot — not for daily use.

```powershell
yarn verify:startup
```

**What happens:**

- Starts `crm-verify` on ports `:25432`, `:28080`, services at dev+10000
- Waits for all `/health/ready`
- Prints startup matrix
- Full teardown — no containers left

**Success:** matrix printed, exit code 0, no `crm-verify` containers after.

**Never touches** dev `:5432` / `:8080`.

---

## Step 5 — architecture and contract checks

```powershell
yarn verify:architecture    # eslint + messaging + event catalog
yarn ci:validate-events     # event JSON schemas
yarn check:messaging        # messaging architecture rules
yarn check:event-catalog
yarn check:rabbit-routing
yarn lint:architecture
```

No Docker. Run before PR if you changed events or messaging code.

---

## Step 6 — messaging integration (optional)

```powershell
yarn test:messaging
```

Tests messaging harness — see `scripts/test/messaging-integration.mjs`.

**Per-service integration** (uses dev Postgres — not isolated):

```powershell
$env:USERS_INTEGRATION_TEST="1"
$env:DATABASE_URL="postgres://postgres:postgres@localhost:5432/crm"
yarn workspace @crm/users-service test
```

---

## Step 7 — prod smoke (Dockerfile check)

```powershell
yarn smoke:prod
```

Builds `companies-service` production image, runs minimal stack on `:35432` / `:38080`, hits API, tears down.

**Success:** `[smoke:prod] passed`

Details: [../prod/RUN.md](../prod/RUN.md#smoke-before-full-prod).

---

## Run full CI locally (before PR)

```powershell
yarn lint
yarn typecheck
yarn test:unit
yarn test:integration
yarn test:e2e
yarn verify:startup
```

Matches `.github/workflows/repo-ci.yml`.

---

## Test database seed

```powershell
yarn db:seed:test --target test
# or via workspace:
yarn workspace @crm/fill-dump-db run seed:test
```

Uses `DATABASE_URL` pointing to `:15432/crm_test` (injected by test scripts).

Fixtures: `scripts/fill_dump_db/src/test-fixtures.ts`.

---

## How to update tests

| You changed… | Update |
| ------------ | ------ |
| API response shape | `scripts/test/api-helpers.mjs` |
| Test ports | `scripts/dev/port-registry.mjs`, `docker/test/compose.yml` |
| Test seed data | `scripts/fill_dump_db/src/test-fixtures.ts` |
| Gateway routes for test | `scripts/test/generate-test-traefik.mjs` |
| New service in integration | `scripts/test/stack.mjs`, `scripts/test/integration.mjs` |

---

## When something breaks

→ [DEBUG.md](./DEBUG.md)

---

## Related repo docs

- [../../../scripts/test/README.md](../../../scripts/test/README.md)
- [../../../scripts/verify/README.md](../../../scripts/verify/README.md)
- [../../../scripts/smoke/README.md](../../../scripts/smoke/README.md)
- [../README.md](../README.md)
