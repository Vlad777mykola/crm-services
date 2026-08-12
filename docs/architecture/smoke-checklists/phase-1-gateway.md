# Smoke Checklist — Phase 1 (Gateway)

Manual verification only, per `smoke-checklist-template.md`. Run
`docker compose -f docker/docker-compose.yml -f docker/docker-compose.microservices-core.yml up`
first.

```txt
GET /health
Gateway routes to: legacy-backend
Auth required: no
Expected status: 200
Expected response: { status: "ok", uptime, timestamp }
Rollback route: n/a — point VITE_API_URL back at :4000 to bypass the gateway entirely

GET /health/live
Gateway routes to: legacy-backend
Expected status: 200, { status: "ok" }

GET /health/ready
Gateway routes to: legacy-backend
Expected status: 200 (or 503 if DB not ready), matches calling :4000 directly

POST /auth/register
Gateway routes to: legacy-backend
Sample body: { "email": "smoke@test.com", "name": "Smoke", "password": "Passw0rd!" }
Expected status: 201, identical payload shape to calling :4000 directly
Header check: response includes X-Request-Id

POST /auth/login
Gateway routes to: legacy-backend
Expected status: 200, refreshToken cookie set with path=/auth

GET /companies/public
Gateway routes to: legacy-backend
Expected status: 200, identical to direct call

GET /companies/:companyId/members
Gateway routes to: legacy-backend (still — company-members-service doesn't exist yet)
Auth required: yes
Expected status: 200/403/404 matching direct-call behavior

GET /specialists/public
Gateway routes to: legacy-backend
Expected status: 200

GET /specialists/me/services
Gateway routes to: legacy-backend
Auth required: yes
Expected status: 200 (confirms the Q13-relevant path isn't accidentally swallowed by
  the generic /specialists/ fallback — should match its own exact-match block)

GET /services/public
Gateway routes to: legacy-backend
Expected status: 200

GET /appointments/me
Gateway routes to: legacy-backend
Auth required: yes
Expected status: 200

POST /appointments/:appointmentId/review
Gateway routes to: legacy-backend
Expected status: matches direct-call behavior (confirms this doesn't get swallowed by
  the generic /appointments/ fallback — should match the /review-specific block first)

GET /notifications/me
Gateway routes to: legacy-backend
Auth required: yes
Expected status: 200

GET /app/summary
Gateway routes to: legacy-backend
Auth required: yes
Expected status: 200

[header check, every request]
Response includes X-Request-Id.
If a request is sent WITH an X-Request-Id header, the same value comes back
  (gateway reuses it via the nginx map directive, does not overwrite it).
If a request is sent WITHOUT one, gateway generates one via nginx's $request_id.
Backend logs (pino) include the same request id as the response header, once
  requestLogger.ts's genReqId change is deployed.

[unmatched path check]
GET /this-route-does-not-exist
Expected status: 404 from the gateway's catch-all `location /` block, not a 502/504
  (confirms the gateway isn't silently proxying unknown paths to legacy-backend)
```

## Result

Not yet run against a live environment in this session (Docker Compose was not
started as part of this pass — code and config were written and reviewed, not
executed, since the sandbox has no working shell backend on this machine). Run this
checklist manually before considering Phase 1 fully done.
