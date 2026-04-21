from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from app.db import get_connection


def _to_uuid(value: str | uuid.UUID, *, field: str) -> uuid.UUID:
    try:
        return value if isinstance(value, uuid.UUID) else uuid.UUID(str(value))
    except ValueError as exc:
        raise ValueError(f"invalid_{field}") from exc


def create_session(
    dsn: str,
    *,
    user_id: str,
    ttl_minutes: int,
) -> str:
    uid = _to_uuid(user_id, field="user_id")
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=int(ttl_minutes))

    with get_connection(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO sessions (user_id, expires_at, is_active, last_activity_at)
                VALUES (%s, %s, TRUE, NOW())
                RETURNING id
                """,
                (uid, expires_at),
            )
            sid = cur.fetchone()[0]
    return str(sid)


def refresh_session_activity(
    dsn: str,
    *,
    session_id: str,
    inactivity_timeout_minutes: int,
) -> bool:
    sid = _to_uuid(session_id, field="session_id")
    timeout = max(int(inactivity_timeout_minutes), 1)

    with get_connection(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE sessions
                SET last_activity_at = NOW()
                WHERE id = %s
                  AND is_active = TRUE
                  AND expires_at > NOW()
                  AND last_activity_at > (NOW() - (%s || ' minutes')::interval)
                """,
                (sid, timeout),
            )
            if cur.rowcount > 0:
                return True

            cur.execute(
                """
                UPDATE sessions
                SET is_active = FALSE
                WHERE id = %s
                  AND is_active = TRUE
                  AND (
                        expires_at <= NOW()
                     OR last_activity_at <= (NOW() - (%s || ' minutes')::interval)
                  )
                """,
                (sid, timeout),
            )
            return False


def revoke_session(dsn: str, *, session_id: str) -> None:
    sid = _to_uuid(session_id, field="session_id")
    with get_connection(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE sessions
                SET is_active = FALSE
                WHERE id = %s
                """,
                (sid,),
            )
