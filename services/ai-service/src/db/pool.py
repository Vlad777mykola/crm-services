"""Postgres connection helper - talks only to postgres-ai (AI_DATABASE_URL)."""
from __future__ import annotations

import psycopg2
import psycopg2.extensions

import config


def get_connection() -> psycopg2.extensions.connection:
    conn = psycopg2.connect(config.AI_DATABASE_URL)
    conn.autocommit = True
    return conn
