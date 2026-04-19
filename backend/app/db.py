"""Ligação ao PostgreSQL """

import os
from contextlib import contextmanager

import psycopg


def get_dsn(explicit: str | None = None) -> str:
    dsn = explicit or os.environ.get("DATABASE_URL")
    if not dsn:
        raise ValueError("DATABASE_URL is not configured")
    return dsn


@contextmanager
def get_connection(dsn: str | None = None):
    with psycopg.connect(get_dsn(dsn), connect_timeout=5) as conn:
        yield conn


def ping_database(dsn: str | None = None) -> None:
    with get_connection(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1")
