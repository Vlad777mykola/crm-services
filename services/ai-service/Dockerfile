# syntax=docker/dockerfile:1
#
# Standalone service - own requirements.txt, own database (postgres-ai, never
# main-postgres). Build context is this folder only (not the repo root).
# Build with:
#   docker build -f services/ai-service/Dockerfile -t crm-ai-service services/ai-service

FROM python:3.12-slim

# Otherwise print() output is buffered and never shows up in `docker logs`
# since stdout isn't a TTY inside a container.
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 4200
CMD ["python", "src/main.py"]
