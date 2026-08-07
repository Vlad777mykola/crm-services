"""All reads/writes here are scoped to this service's own AI-owned tables in
postgres-ai - see docs/architecture/service-ownership.md."""
from __future__ import annotations

import uuid
from datetime import date

import psycopg2.extensions


def mark_processed(conn: psycopg2.extensions.connection, event_id: str, consumer_name: str) -> bool:
    """Returns True the first time this event_id is seen, False if it was already processed."""
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO processed_events (event_id, consumer_name) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            (event_id, consumer_name),
        )
        return cur.rowcount == 1


def increment_event_count(conn: psycopg2.extensions.connection, event_type: str, company_id: str) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO ai_events (event_type, company_id, count)
            VALUES (%s, %s, 1)
            ON CONFLICT (event_type, company_id) DO UPDATE SET count = ai_events.count + 1
            """,
            (event_type, company_id),
        )


def record_daily_review(conn: psycopg2.extensions.connection, company_id: str, rating: float) -> tuple[int, float]:
    """Upserts today's company_daily_stats row, then returns the company's
    all-time review count and average rating across every day on file."""
    today = date.today()
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO company_daily_stats (company_id, day, review_count, rating_sum)
            VALUES (%s, %s, 1, %s)
            ON CONFLICT (company_id, day) DO UPDATE SET
                review_count = company_daily_stats.review_count + 1,
                rating_sum = company_daily_stats.rating_sum + excluded.rating_sum
            """,
            (company_id, today, rating),
        )
        cur.execute(
            "SELECT SUM(review_count), SUM(rating_sum) FROM company_daily_stats WHERE company_id = %s",
            (company_id,),
        )
        review_count, rating_sum = cur.fetchone()

    average_rating = round(float(rating_sum) / review_count, 2) if review_count else 0.0
    return review_count, average_rating


def create_recommendation(
    conn: psycopg2.extensions.connection,
    appointment_id: str,
    company_id: str,
    summary: str,
    confidence: float,
) -> str:
    job_id = str(uuid.uuid4())
    recommendation_id = str(uuid.uuid4())
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO ai_jobs (id, job_type, aggregate_id, status) VALUES (%s, %s, %s, 'completed')",
            (job_id, "appointment_recommendation", appointment_id),
        )
        cur.execute(
            """
            INSERT INTO ai_recommendations (id, job_id, appointment_id, company_id, summary, confidence)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (recommendation_id, job_id, appointment_id, company_id, summary, confidence),
        )
    return recommendation_id
