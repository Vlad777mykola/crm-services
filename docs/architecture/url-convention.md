# URL Convention

## Rule

**No `/api` prefix.** Current API paths stay exactly as they are today:

```txt
/auth/*
/users/*
/companies/*
/specialists/*
/appointments/*
/notifications/*
/services/*
/health, /health/live, /health/ready
/app/summary
```

Reviews are not under a `/reviews/*` prefix — they are scattered under
`/appointments/:id/review`, `/companies/:id/reviews`, `/services/:id/reviews`,
`/specialists/:id/reviews` (see `route-inventory.md`).

## Why

`contracts/openapi.yaml` and the frontend already use these paths without `/api`:

```39:75:frontend/src/features/auth/api/authApi.ts
const response = await fetch(`${getApiUrl()}/auth/register`, {
...
const response = await fetch(`${getApiUrl()}/auth/login`, {
...
const response = await fetch(`${getApiUrl()}/auth/refresh`, {
...
await fetch(`${getApiUrl()}/auth/logout`, { method: 'POST', credentials: 'include' });
```

Changing to `/api/*` would require touching every frontend API call, the OpenAPI
contract, and — critically — the refresh-token cookie path, which is hardcoded to
`/auth`:

```13:14:backend/src/modules/auth/auth.routes.ts
const REFRESH_COOKIE_NAME = env.REFRESH_TOKEN_COOKIE_NAME;
const REFRESH_COOKIE_PATH = '/auth';
```

There is no technical reason to add `/api` and every reason not to: it's pure churn
across contracts, frontend, and cookie scoping for zero behavioral benefit.

## Gateway responsibility

The gateway is a transparent path-preserving proxy. It does not rewrite, prefix, or
version paths. It:

1. Terminates TLS (later; plain HTTP for local dev).
2. Applies CORS.
3. Enforces request size limits.
4. Injects/propagates `X-Request-Id`.
5. Routes by path to whichever backend currently owns that path (legacy-backend or an
   extracted service).
6. Optionally rate-limits (later).

The gateway does **not** validate JWTs or enforce business permissions (see Q2 in the
implementation plan) — each service validates its own JWT and enforces its own rules.

## Ordered routing model

Because multiple future services share the `/companies/:companyId/*` prefix, the
gateway cannot route `/companies/*` as one rule per service. Rules must be ordered
most-specific-first, generic-fallback-last:

```txt
/companies/:companyId/members/*            -> company-members-service   (Phase 5)
/companies/:companyId/services/*           -> services-catalog-service  (Phase 8)
/companies/:companyId/appointments/*       -> appointments-service      (Phase 9)
/companies/:companyId/specialists          -> company-specialists-service (Phase 7)
/companies/:companyId/specialist-requests  -> company-specialists-service (Phase 7)
/companies/:companyId/specialists/requests -> company-specialists-service (Phase 7)
/companies/:companyId/reviews              -> reviews-service            (Phase 10)
/companies/:companyId/summary              -> legacy / future read-api   (Phase 15)
/companies/:companyId/status-history       -> companies-service          (Phase 4)
/companies/*                               -> companies-service fallback (Phase 4)
```

Similarly, `/specialists/*` splits across three future services:

```txt
/specialists/profile                       -> specialists-service       (Phase 6)
/specialists/me/status-history             -> specialists-service       (Phase 6)
/specialists/me/services                   -> services-catalog-service  (Phase 8, Q13)
/specialists/me/company-requests*          -> company-specialists-service (Phase 7)
/specialists/me/companies                  -> company-specialists-service (Phase 7)
/specialists/me                            -> specialists-service       (Phase 6)
/specialists/public                        -> specialists-service       (Phase 6)
/specialists/:specialistId/reviews         -> reviews-service           (Phase 10)
/specialists/:specialistId                 -> specialists-service fallback (Phase 6)
```

And `/services/*`/`/appointments/*` similarly need `/services/:id/reviews` and
`/appointments/:id/review` peeled off to reviews-service ahead of their generic
fallback rules.

## Examples (final target state, all phases done)

```txt
/auth/login                                -> auth-service
/auth/refresh                              -> auth-service
/users/me                                  -> users-service
/companies/public                          -> companies-service
/companies/:companyId/members/invite       -> company-members-service
/companies/:companyId/services             -> services-catalog-service
/companies/:companyId/appointments         -> appointments-service
/appointments/:appointmentId/review        -> reviews-service
/notifications/me                          -> notifications-service
/app/summary                               -> legacy-backend (until Phase 15) or read-api
/health/live                               -> whichever service the Ingress rule targets, not gateway-owned
```

## Frontend impact

`VITE_API_URL` changes to point at the gateway host instead of the backend host
directly. No path strings in `frontend/src/features/*/api/*.ts` change, because paths
are identical before and after the gateway is introduced.

```txt
Before: VITE_API_URL=http://localhost:4000        (direct to backend)
After:  VITE_API_URL=http://localhost:8080         (gateway)
```

Cookie behavior is unaffected as long as gateway and all backends share the same
origin from the browser's perspective (gateway is the single origin the browser talks
to; it proxies to backends server-side).

## Done when

- All future phase documents reference paths from `route-inventory.md`, never invent
  new ones.
- No `/api` prefix appears anywhere in gateway config, OpenAPI, or frontend code.
- Gateway config demonstrates ordered rules for `/companies/*` and `/specialists/*`,
  not single broad prefixes.

**Stop — awaiting approval before proceeding to Task C.**
