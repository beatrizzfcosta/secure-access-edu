from __future__ import annotations

import json

from app.db import get_connection


def create_audit_log(
    event_type: str,
    user_id: str | None = None,
    details=None,
    ip_address: str | None = None,
    resource_type: str | None = None,
    resource_id: str | None = None,
) -> None:
    serialized_details = None
    if details is not None:
        serialized_details = details if isinstance(details, str) else json.dumps(details, ensure_ascii=True)

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO audit_logs (
                    user_id,
                    event_type,
                    details,
                    ip_address,
                    resource_type,
                    resource_id
                )
                VALUES (%s::uuid, %s, %s, %s, %s, %s::uuid)
                """,
                (user_id, event_type, serialized_details, ip_address, resource_type, resource_id),
            )


def list_audit_logs(
    *,
    limit: int = 100,
    event_type: str | None = None,
    user_id: str | None = None,
) -> list[dict]:
    safe_limit = max(1, min(int(limit), 500))

    clauses = []
    params = []

    if event_type:
        clauses.append("event_type = %s")
        params.append(event_type)

    if user_id:
        clauses.append("user_id = %s::uuid")
        params.append(user_id)

    where_sql = f"WHERE {' AND '.join(clauses)}" if clauses else ""

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT id, user_id, occurred_at, event_type, details, ip_address, resource_type, resource_id
                FROM audit_logs
                {where_sql}
                ORDER BY occurred_at DESC
                LIMIT %s
                """,
                (*params, safe_limit),
            )
            rows = cur.fetchall()

    out = []
    for row in rows:
        out.append(
            {
                "id": str(row[0]),
                "user_id": str(row[1]) if row[1] else None,
                "occurred_at": row[2].isoformat() if row[2] else None,
                "event_type": row[3],
                "details": row[4],
                "ip_address": row[5],
                "resource_type": row[6],
                "resource_id": str(row[7]) if row[7] else None,
            }
        )

    return out
