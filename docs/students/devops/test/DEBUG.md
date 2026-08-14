# Test — how to debug

## Current status

**CURRENT VERIFIED** — common test failure modes.

**Before debugging:** confirm [RUN.md](./RUN.md) command and which test layer failed.

---

## Which layer failed?

```text
yarn test              → unit (no Docker)
yarn test:integration  → crm-test stack (:15432, :18080)
yarn test:e2e          → crm-test + frontend (:25173)
yarn verify:startup    → crm-verify stack (:25432, :28080)
yarn smoke:prod        → crm-smoke stack (:35432, :38080)
```

Each layer has different ports and Docker projects — don't mix debug steps.

---

## Unit test failures (`yarn test`)

### Symptom: one service package fails

```powershell
cd services\<failing-service>
yarn test
```

Read Vitest output — usually assertion or import error.

### Symptom: frontend tests fail

```powershell
yarn workspace @crm/frontend test
```

### Symptom: `vitest` not found

```powershell
yarn install
```

### Symptom: integration env vars leak into unit tests

Some tests gate on env vars (e.g. `USERS_INTEGRATION_TEST`). Unset them:

```powershell
Remove-Item Env:USERS_INTEGRATION_TEST -ErrorAction SilentlyContinue
```

---

## Integration test failures (`yarn test:integration`)

### Symptom: port already in use / bind failed

**Cause:** Dev or another test stack using ports, or previous `crm-test` not torn down.

```powershell
docker compose -p crm-test -f docker/test/compose.yml down -v --remove-orphans
yarn dev stop
```

Test uses `:15432`, not `:5432` — but Docker name conflicts can still happen.

### Symptom: `companies-service not ready`

**Check:**

```powershell
docker compose -p crm-test -f docker/test/compose.yml ps
curl http://localhost:24003/health/ready
```

Read spawn logs from `scripts/test/stack.mjs` — migrate may have failed.

### Symptom: `GET /companies/public failed: 502/503`

**Cause:** Gateway up but backend not ready or wrong Traefik config.

```powershell
curl http://localhost:18080/ping
curl http://localhost:24003/health/ready
```

Regenerate test Traefik if routes changed:

```powershell
node scripts/test/generate-test-traefik.mjs
```

### Symptom: `Expected ≥1 published company`

**Cause:** Seed or migrate failed on test DB.

```powershell
# Manual reproduce
docker compose -p crm-test -f docker/test/compose.yml up -d --wait
$env:DATABASE_URL="postgres://postgres:postgres@localhost:15432/crm_test"
yarn db:migrate --target test
yarn db:seed:test --target test
```

Inspect `crm_test` database for `companies_schema.companies`.

### Symptom: stack left running after crash

```powershell
docker compose -p crm-test -f docker/test/compose.yml down -v --remove-orphans
docker ps -a | findstr crm-test
```

---

## E2E test failures (`yarn test:e2e`)

All integration debug steps apply, plus:

### Symptom: `CORS allow-origin mismatch`

**Cause:** Gateway CORS config doesn't allow test frontend origin `http://localhost:25173`.

Check Traefik CORS middleware in `docker/test/traefik/dynamic.yml`.

### Symptom: `frontend dev server not reachable`

```powershell
curl http://localhost:25173/
```

Port `25173` = test frontend (dev uses `5173`).

### Symptom: `expected ≥2 published companies`

E2E uses full test fixtures, not companies-only seed. Check `scripts/fill_dump_db/src/test-fixtures.ts`.

---

## Verify startup failures (`yarn verify:startup`)

### Symptom: one service in matrix not ready

Note which port failed (verify = dev + 10000, e.g. auth `14001`).

```powershell
curl http://localhost:14001/health/ready
```

Check that service's `.env.example` matches verify URLs in `scripts/dev/verify-env.mjs`.

### Symptom: verify containers left after failure

```powershell
docker compose -p crm-verify -f docker/verify/compose.yml down -v --remove-orphans
```

### Symptom: conflicts with dev

Verify uses `:25432` — should not conflict with dev `:5432`. If both fail, Docker resource issue — restart Docker Desktop.

---

## Smoke prod failures (`yarn smoke:prod`)

### Symptom: `docker build` fails

```powershell
docker compose -p crm-smoke -f docker/smoke/compose.yml build companies-service
```

Check `services/companies-service/Dockerfile` and TypeScript compile errors.

### Symptom: gateway ping failed

```powershell
docker compose -p crm-smoke -f docker/smoke/compose.yml ps
curl http://localhost:38080/ping
```

### Symptom: migrate/seed on smoke DB fails

Smoke uses `:35432` with `--target smoke`. Check `scripts/db/` target config.

### Cleanup

```powershell
docker compose -p crm-smoke -f docker/smoke/compose.yml down -v --remove-orphans
```

---

## Architecture / contract check failures

```powershell
yarn ci:validate-events
yarn check:messaging
yarn lint:architecture
```

| Failure | Likely cause |
| ------- | ------------ |
| Event schema validation | JSON schema mismatch in `contracts/events/` |
| Messaging check | Direct RabbitMQ publish in handler, missing catalog entry |
| ESLint architecture | Import boundary violation — see `tools/eslint-plugin-crm/` |
| dependency-cruiser | Cross-service import in `services/` |

---

## CI vs local differences

| CI | Local |
| -- | ----- |
| Ubuntu, fresh checkout | Your OS, possibly dirty DB |
| `yarn install --frozen-lockfile` | `yarn install` |
| No dev stack running | You might have `yarn dev` running |

**Best practice:** stop dev before integration/e2e/verify:

```powershell
yarn dev stop
```

---

## Debug checklist (copy-paste)

```powershell
# 1. Clean stale test stacks
docker compose -p crm-test -f docker/test/compose.yml down -v --remove-orphans
docker compose -p crm-verify -f docker/verify/compose.yml down -v --remove-orphans
docker compose -p crm-smoke -f docker/smoke/compose.yml down -v --remove-orphans

# 2. Stop dev
yarn dev stop

# 3. Re-run failing command with full output
yarn test:integration

# 4. If still failing — manual stack
docker compose -p crm-test -f docker/test/compose.yml up -d --wait
curl http://localhost:18080/ping
curl http://localhost:24003/health/ready
```

---

## How to update after fixing tests

| Fix type | Action |
| -------- | ------ |
| Test assertion | Update test file in service or `scripts/test/` |
| Port change | Update `port-registry.mjs` + compose + regenerate Traefik |
| New endpoint in integration | Update `integration.mjs` / `api-helpers.mjs` |
| Seed data | Update `test-fixtures.ts` |

---

## Related

- [RUN.md](./RUN.md)
- [../dev/DEBUG.md](../dev/DEBUG.md) — if failure involves dev Postgres
- [../README.md](../README.md)
