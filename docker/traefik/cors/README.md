# Gateway CORS configuration

Browser `Access-Control-*` headers are set **only by Traefik**, not by microservices.

| File | Used by |
|---|---|
| `dev.middleware.yml` | Local dev (`compose.gateway.yml`, containerized dev stacks) |
| `prod.middleware.yml` | `docker/prod/compose.yml` |

Edit **dev** to allow more localhost origins (regex or list). Edit **prod** with your real
frontend URL before deploy.

Compose mounts the chosen file as `/etc/traefik/dynamic/cors.middleware.yml` alongside
the route YAML (`routes.yml`). Traefik merges both via `--providers.file.directory`.

Frontend must call the gateway (`http://localhost:8080` locally), not service ports.
