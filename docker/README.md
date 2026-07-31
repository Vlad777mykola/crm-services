# docker

Local development infrastructure and container definitions.

- `docker-compose.yml` — postgres, redis, backend, and optional frontend/worker services (via profiles). See Step 5.
- Backend/frontend Dockerfiles live in their respective `backend/` and `frontend/` folders so each service stays independently buildable and deployable.
