"""Operações de tarefas em PostgreSQL (CRUD + atribuições)."""

from __future__ import annotations

import uuid
from typing import Any

from app.db import get_connection


def user_has_role(dsn: str, user_id: str, role_name: str) -> bool:
    uid = _to_uuid(user_id, field="user_id")
    with get_connection(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT 1
                FROM user_roles ur
                JOIN roles r ON r.id = ur.role_id
                WHERE ur.user_id = %s AND r.name = %s
                LIMIT 1
                """,
                (uid, role_name),
            )
            return cur.fetchone() is not None


def user_exists(dsn: str, user_id: str) -> bool:
    uid = _to_uuid(user_id, field="user_id")
    with get_connection(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM users WHERE id = %s", (uid,))
            return cur.fetchone() is not None


def user_may_be_assigned_by_teacher(dsn: str, user_id: str) -> bool:
    """
    Docente pode atribuir a quem tem papel `student`, ou a contas sem `user_roles`
    (RBAC por preencher — comum em dev; tratamos como elegível para estudante).
    Quem só tem outros papéis (ex.: só teacher/admin) não entra.
    """
    uid = _to_uuid(user_id, field="user_id")
    with get_connection(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT r.name
                FROM user_roles ur
                JOIN roles r ON r.id = ur.role_id
                WHERE ur.user_id = %s
                """,
                (uid,),
            )
            roles = {row[0] for row in cur.fetchall()}
    if not roles:
        return True
    return "student" in roles


def list_assignable_users(dsn: str, *, requester_role: str) -> list[dict[str, Any]]:
    with get_connection(dsn) as conn:
        with conn.cursor() as cur:
            if requester_role == "admin":
                cur.execute(
                    """
                    SELECT u.id, u.username, u.email,
                           COALESCE(json_agg(r.name ORDER BY r.name)
                             FILTER (WHERE r.name IS NOT NULL), '[]'::json)
                    FROM users u
                    LEFT JOIN user_roles ur ON ur.user_id = u.id
                    LEFT JOIN roles r ON r.id = ur.role_id
                    WHERE u.is_blocked = FALSE
                    GROUP BY u.id, u.username, u.email
                    ORDER BY u.username
                    """
                )
            elif requester_role == "teacher":
                cur.execute(
                    """
                    SELECT u.id, u.username, u.email,
                           COALESCE(json_agg(r2.name ORDER BY r2.name)
                             FILTER (WHERE r2.name IS NOT NULL), '[]'::json)
                    FROM users u
                    LEFT JOIN user_roles ur2 ON ur2.user_id = u.id
                    LEFT JOIN roles r2 ON r2.id = ur2.role_id
                    WHERE u.is_blocked = FALSE
                      AND (
                        EXISTS (
                          SELECT 1
                          FROM user_roles ur_s
                          JOIN roles r_st ON r_st.id = ur_s.role_id
                          WHERE ur_s.user_id = u.id AND r_st.name = 'student'
                        )
                        OR NOT EXISTS (
                          SELECT 1 FROM user_roles ur0 WHERE ur0.user_id = u.id
                        )
                      )
                    GROUP BY u.id, u.username, u.email
                    ORDER BY u.username
                    """
                )
            else:
                return []

            rows = cur.fetchall()

    out: list[dict[str, Any]] = []
    for uid, username, email, roles_json in rows:
        roles = roles_json if isinstance(roles_json, list) else []
        out.append(
            {
                "id": str(uid),
                "username": _json_text(username) or "",
                "email": _json_text(email) or "",
                "roles": roles,
            }
        )
    return out


def get_assignees_for_tasks(dsn: str, task_ids: list[str]) -> dict[str, list[dict[str, str]]]:
    if not task_ids:
        return {}
    uuids = [_to_uuid(t, field="task_id") for t in task_ids]
    placeholders = ",".join(["%s"] * len(uuids))
    with get_connection(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT ta.task_id, u.id, u.username
                FROM task_assignments ta
                JOIN users u ON u.id = ta.user_id
                WHERE ta.task_id IN ({placeholders})
                ORDER BY ta.task_id, u.username
                """,
                uuids,
            )
            rows = cur.fetchall()

    result: dict[str, list[dict[str, str]]] = {}
    for task_id, uid, username in rows:
        key = str(task_id)
        result.setdefault(key, []).append(
            {"id": str(uid), "username": _json_text(username) or ""}
        )
    return result


def _assert_assignees_allowed(
    dsn: str,
    *,
    requester_role: str,
    assignee_user_ids: list[str],
) -> None:
    seen: set[str] = set()
    for raw in assignee_user_ids:
        aid = str(raw).strip()
        if not aid or aid in seen:
            continue
        seen.add(aid)
        if not user_exists(dsn, aid):
            raise ValueError("assignee_not_found")
        if requester_role == "teacher" and not user_may_be_assigned_by_teacher(
            dsn, aid
        ):
            raise ValueError("assignee_must_be_student")


def _to_uuid(value: str | uuid.UUID, *, field: str) -> uuid.UUID:
    try:
        return value if isinstance(value, uuid.UUID) else uuid.UUID(str(value))
    except ValueError as exc:
        raise ValueError(f"invalid_{field}") from exc


def _is_same_uuid(value: Any, other: uuid.UUID) -> bool:
    """Compara um UUID vindo da BD (uuid.UUID, str, etc.) com um uuid.UUID."""
    if value is None:
        return False
    try:
        parsed = value if isinstance(value, uuid.UUID) else uuid.UUID(str(value))
    except ValueError:
        return False
    return parsed == other


def _json_text(value: Any) -> str | None:
    """Garante texto JSON-serializável a partir de colunas PostgreSQL / drivers."""
    if value is None:
        return None
    if isinstance(value, str):
        return value
    if isinstance(value, (bytes, bytearray, memoryview)):
        return bytes(value).decode("utf-8", errors="replace")
    return str(value)


def _map_task_row(row: tuple[Any, Any, Any, Any]) -> dict[str, Any]:
    task_id, title, description, created_by = row
    return {
        "id": str(task_id),
        "title": _json_text(title) or "",
        "description": _json_text(description),
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


def create_task_with_assignees(
    dsn: str,
    *,
    title: str,
    description: str | None,
    created_by: str,
    assignee_user_ids: list[str],
    requester_role: str,
) -> dict[str, Any]:
    creator_id = _to_uuid(created_by, field="created_by")
    _assert_assignees_allowed(
        dsn, requester_role=requester_role, assignee_user_ids=assignee_user_ids
    )
    unique_ids = list(
        dict.fromkeys(str(x).strip() for x in assignee_user_ids if str(x).strip())
    )

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
            task_row = _map_task_row(row)
            tid = _to_uuid(task_row["id"], field="task_id")

            for aid in unique_ids:
                assignee = _to_uuid(aid, field="assignee_user_id")
                cur.execute(
                    """
                    INSERT INTO task_assignments (task_id, user_id, assigned_by)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (task_id, user_id) DO NOTHING
                    """,
                    (tid, assignee, creator_id),
                )

    return task_row


def set_task_assignees(
    dsn: str,
    *,
    task_id: str | uuid.UUID,
    requester_id: str,
    requester_role: str,
    assignee_user_ids: list[str],
) -> None:
    tid = _to_uuid(task_id, field="task_id")
    requester = _to_uuid(requester_id, field="requester_id")

    _assert_assignees_allowed(
        dsn, requester_role=requester_role, assignee_user_ids=assignee_user_ids
    )
    unique_ids = list(
        dict.fromkeys(str(x).strip() for x in assignee_user_ids if str(x).strip())
    )

    with get_connection(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT created_by FROM tasks WHERE id = %s", (tid,))
            row = cur.fetchone()
            if not row:
                raise ValueError("task_not_found")

            created_by = row[0]
            if requester_role != "admin" and not _is_same_uuid(created_by, requester):
                raise PermissionError("task_modify_requires_creator_or_admin")

            cur.execute("DELETE FROM task_assignments WHERE task_id = %s", (tid,))

            for aid in unique_ids:
                assignee = _to_uuid(aid, field="assignee_user_id")
                cur.execute(
                    """
                    INSERT INTO task_assignments (task_id, user_id, assigned_by)
                    VALUES (%s, %s, %s)
                    """,
                    (tid, assignee, requester),
                )


def get_tasks_for_user(dsn: str, *, user_id: str, role: str) -> list[dict[str, Any]]:
    """Visível: tarefas criadas pelo utilizador ou em que é destinatário (atribuído a si)."""
    if role not in ("admin", "teacher", "student"):
        return []

    uid = _to_uuid(user_id, field="user_id")

    with get_connection(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT t.id, t.title, t.description, t.created_by
                FROM tasks t
                WHERE t.created_by = %s
                   OR EXISTS (
                     SELECT 1 FROM task_assignments ta
                     WHERE ta.task_id = t.id AND ta.user_id = %s
                   )
                ORDER BY t.title ASC
                """,
                (uid, uid),
            )
            rows = cur.fetchall()

    return [_map_task_row(r) for r in rows]


def get_task_for_user(
    dsn: str,
    *,
    task_id: str | uuid.UUID,
    requester_id: str,
    requester_role: str,
) -> dict[str, Any] | None:
    """Acesso de leitura: criador ou destinatário da tarefa (qualquer papel)."""
    if requester_role not in ("admin", "teacher", "student"):
        return None

    tid = _to_uuid(task_id, field="task_id")
    uid = _to_uuid(requester_id, field="user_id")

    with get_connection(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT t.id, t.title, t.description, t.created_by
                FROM tasks t
                WHERE t.id = %s
                  AND (
                    t.created_by = %s
                    OR EXISTS (
                      SELECT 1 FROM task_assignments ta
                      WHERE ta.task_id = t.id AND ta.user_id = %s
                    )
                  )
                """,
                (tid, uid, uid),
            )
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
            if requester_role != "admin" and not _is_same_uuid(created_by, uid):
                raise PermissionError("task_modify_requires_creator_or_admin")

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
            if requester_role != "admin" and not _is_same_uuid(created_by, uid):
                raise PermissionError("task_modify_requires_creator_or_admin")

            cur.execute("DELETE FROM tasks WHERE id = %s RETURNING id", (tid,))
            return cur.fetchone() is not None


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

            if requester_role != "admin" and not _is_same_uuid(row[0], assigner):
                raise PermissionError("task_modify_requires_creator_or_admin")

            cur.execute("SELECT 1 FROM users WHERE id = %s", (assignee,))
            if not cur.fetchone():
                raise ValueError("assignee_not_found")

            if requester_role == "teacher" and not user_may_be_assigned_by_teacher(
                dsn, str(assignee)
            ):
                raise ValueError("assignee_must_be_student")

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
            is_creator = _is_same_uuid(row[0], requester)

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
                """
                DELETE FROM task_assignments
                WHERE task_id = %s AND user_id = %s
                RETURNING task_id
                """,
                (tid, assignee),
            )
            return cur.fetchone() is not None
