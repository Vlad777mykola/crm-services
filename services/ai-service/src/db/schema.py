"""Applies db/migrations/*.sql in order - simple, dependency-free 'migrations'
matching the stdlib-first style this repo already uses for its Node/Python
workers. Every statement is idempotent (CREATE TABLE IF NOT EXISTS), so this
is safe to run on every startup instead of tracking which migrations already
ran."""
from __future__ import annotations

from pathlib import Path

import psycopg2.extensions

MIGRATIONS_DIR = Path(__file__).parent / "migrations"


def ensure_schema(conn: psycopg2.extensions.connection) -> None:
    for migration_path in sorted(MIGRATIONS_DIR.glob("*.sql")):
        with conn.cursor() as cur:
            cur.execute(migration_path.read_text())
