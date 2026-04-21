"""Operações de tarefas em PostgreSQL (CRUD + atribuições)."""

from __future__ import annotations

import uuid
from typing import Any

from app.db import get_connection


def _to_uuid(value: str | uuid.UUID, *, field: str) -> uuid.UUID:
    try:
        return value if isinstance(value, uuid.UUID) else uuid.UUID(str(value))
    except ValueError as exc:
        raise ValueError(f"invalid_{field}") from exc


def _map_task_row(row: tuple[Any, Any, Any, Any]) -> dict[str, Any]:
    task_id, title, description, created_by = row
    return {
        "id": str(task_id),
        "title": title,
        "description": description,
        "created_by": str(created_by),
    }


def create_task(dsn: str, *, title: str, description: str | None, created_by: str) -> dict[str, Any]:
    creator_id = _to_uuid(created_by, field="created_by")

    with get_connection(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO tasks (title, description, created_by)
                VALUES (%s, %s, %s)
                RETURNING id, title, description, created_by
                """,
                (title, description, creator_id),
            )
            row = cur.fetchone()

    return _map_task_row(row)


def get_tasks_for_user(dsn: str, *, user_id: str, role: str) -> list[dict[str, Any]]:
    uid = _to_uuid(user_id, field="user_id")

    with get_connection(dsn) as conn:
        with conn.cursor() as cur:
            if role == "admin":
                cur.execute(
                    """
                    SELECT t.id, t.title, t.description, t.created_by
                    FROM tasks t
                    ORDER BY t.title ASC
                    """
                )
            elif role == "teacher":
                cur.execute(
                    """
                    SELECT DISTINCT t.id, t.title, t.description, t.created_by
                    FROM tasks t
                    LEFT JOIN task_assignments ta ON ta.task_id = t.id
                    WHERE t.created_by = %s OR ta.assigned_by = %s
                    ORDER BY t.title ASC
                    """,
                    (uid, uid),
                )
            elif role == "student":
                cur.execute(
                    """
                    SELECT DISTINCT t.id, t.title, t.description, t.created_by
                    FROM tasks t
                    INNER JOIN task_assignments ta ON ta.task_id = t.id
                    WHERE ta.user_id = %s
                    ORDER BY t.title ASC
                    """,
                    (uid,),
                )
            else:
                return []

            rows = cur.fetchall()

    return [_map_task_row(r) for r in rows]


def get_task_for_user(
    dsn: str,
    *,
    task_id: str | uuid.UUID,
    requester_id: str,
    requester_role: str,
) -> dict[str, Any] | None:
    tid = _to_uuid(task_id, field="task_id")
    uid = _to_uuid(requester_id, field="user_id")

    with get_connection(dsn) as conn:
        with conn.cursor() as cur:
            if requester_role == "admin":
                cur.execute(
                    """
                    SELECT t.id, t.title, t.description, t.created_by
                    FROM tasks t
                    WHERE t.id = %s
                    """,
                    (tid,),
                )
            elif requester_role == "teacher":
                cur.execute(
                    """
                    SELECT DISTINCT t.id, t.title, t.description, t.created_by
                    FROM tasks t
                    LEFT JOIN task_assignments ta ON ta.task_id = t.id
                    WHERE t.id = %s AND (t.created_by = %s OR ta.assigned_by = %s)
                    """,
                    (tid, uid, uid),
                )
            elif requester_role == "student":
                cur.execute(
                    """
                    SELECT DISTINCT t.id, t.title, t.description, t.created_by
                    FROM tasks t
                    INNER JOIN task_assignments ta ON ta.task_id = t.id
                    WHERE t.id = %s AND ta.user_id = %s
                    """,
                    (tid, uid),
                )
            else:
                return None

            row = cur.fetchone()
            if not row:
                return None

    return _map_task_row(row)


def update_task(
    dsn: str,
    *,
    task_id: str | uuid.UUID,
    requester_id: str,
    requester_role: str,
    title: str | None,
    description: str | None,
) -> dict[str, Any] | None:
    tid = _to_uuid(task_id, field="task_id")
    uid = _to_uuid(requester_id, field="user_id")

    with get_connection(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT created_by FROM tasks WHERE id = %s", (tid,))
            row = cur.fetchone()
            if not row:
                return None

            created_by = row[0]
            if requester_role != "admin" and created_by != uid:
                raise PermissionError("forbidden")

            sets: list[str] = []
            params: list[Any] = []
            if title is not None:
                sets.append("title = %s")
                params.append(title)
            if description is not None:
                sets.append("description = %s")
                params.append(description)

            if not sets:
                cur.execute(
                    """
                    SELECT id, title, description, created_by
                    FROM tasks
                    WHERE id = %s
                    """,
                    (tid,),
                )
                return _map_task_row(cur.fetchone())

            params.append(tid)
            cur.execute(
                f"""
                UPDATE tasks
                SET {', '.join(sets)}
                WHERE id = %s
                RETURNING id, title, description, created_by
                """,
                params,
            )
            updated = cur.fetchone()

    return _map_task_row(updated)


def delete_task(
    dsn: str,
    *,
    task_id: str | uuid.UUID,
    requester_id: str,
    requester_role: str,
) -> bool:
    tid = _to_uuid(task_id, field="task_id")
    uid = _to_uuid(requester_id, field="user_id")

    with get_connection(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT created_by FROM tasks WHERE id = %s", (tid,))
            row = cur.fetchone()
            if not row:
                return False

            created_by = row[0]
            if requester_role != "admin" and created_by != uid:
                raise PermissionError("forbidden")

            cur.execute("DELETE FROM tasks WHERE id = %s", (tid,))
            return cur.rowcount > 0


def assign_task(
    dsn: str,
    *,
    task_id: str | uuid.UUID,
    assignee_user_id: str,
    assigned_by_user_id: str,
    requester_role: str,
) -> dict[str, str]:
    tid = _to_uuid(task_id, field="task_id")
    assignee = _to_uuid(assignee_user_id, field="assignee_user_id")
    assigner = _to_uuid(assigned_by_user_id, field="assigned_by_user_id")

    with get_connection(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT created_by FROM tasks WHERE id = %s", (tid,))
            row = cur.fetchone()
            if not row:
                raise ValueError("task_not_found")

            if requester_role != "admin" and row[0] != assigner:
                raise PermissionError("forbidden")

            cur.execute("SELECT 1 FROM users WHERE id = %s", (assignee,))
            if not cur.fetchone():
                raise ValueError("assignee_not_found")

            cur.execute(
                """
                INSERT INTO task_assignments (task_id, user_id, assigned_by)
                VALUES (%s, %s, %s)
                ON CONFLICT (task_id, user_id) DO NOTHING
                """,
                (tid, assignee, assigner),
            )

    return {
        "task_id": str(tid),
        "user_id": str(assignee),
        "assigned_by": str(assigner),
    }


def unassign_task(
    dsn: str,
    *,
    task_id: str | uuid.UUID,
    assignee_user_id: str,
    requester_id: str,
    requester_role: str,
) -> bool:
    tid = _to_uuid(task_id, field="task_id")
    assignee = _to_uuid(assignee_user_id, field="assignee_user_id")
    requester = _to_uuid(requester_id, field="requester_id")

    with get_connection(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT created_by FROM tasks WHERE id = %s", (tid,))
            row = cur.fetchone()
            if not row:
                return False

            is_admin = requester_role == "admin"
            is_creator = row[0] == requester

            if not is_admin and not is_creator:
                cur.execute(
                    """
                    SELECT 1 FROM task_assignments
                    WHERE task_id = %s AND user_id = %s AND assigned_by = %s
                    """,
                    (tid, assignee, requester),
                )
                if not cur.fetchone():
                    raise PermissionError("forbidden")

            cur.execute(
                "DELETE FROM task_assignments WHERE task_id = %s AND user_id = %s",
                (tid, assignee),
            )
            return cur.rowcount > 0
