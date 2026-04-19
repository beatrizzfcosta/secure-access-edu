"""Audit log persistence helpers."""

import json

from app.db import get_connection


def create_audit_log(event_type, user_id=None, details=None, ip_address=None, resource_type=None, resource_id=None):
    serialized_details = None
    if details is not None:
        if isinstance(details, str):
            serialized_details = details
        else:
            serialized_details = json.dumps(details, ensure_ascii=True)

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
