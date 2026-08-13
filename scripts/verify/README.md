# yarn verify:startup — manual testing guide

Run from repo root (`D:\projects\crm-services`) in PowerShell.

# Quick start (default)

```powershell
yarn dev
# same as: yarn dev companies
```

Starts **frontend + companies-service** only — public company list at `http://localhost:5173`, API via `http://localhost:8080/companies/public`.

```powershell
yarn dev companies --fresh
```

Resets and seeds **published companies only** (fast smoke data).

## Phase 0 gate

```powershell
yarn verify:startup
```

**Expect:** full matrix on verify ports (`:14001`, `:25432`, `:28080`, `:15173`), then cleanup (no `crm-verify` containers left).

**Does not touch** dev Postgres on `:5432` or dev app ports.

## Milestone checks

### Dev CORS fix

```powershell
yarn dev:infra
curl.exe -i -X OPTIONS "http://localhost:8080/health" -H "Origin: http://localhost:5173" -H "Access-Control-Request-Method: GET"
```

### Isolated verify infra only

```powershell
docker compose -p crm-verify -f docker/verify/compose.yml up -d --wait
docker compose -p crm-verify -f docker/verify/compose.yml ps
docker compose -p crm-verify -f docker/verify/compose.yml down -v
```

## After Phase 1

```powershell
yarn dev check
yarn dev dashboard
yarn dev dashboard --fresh
yarn dev stop
```

See the architecture plan for full milestone tables.
