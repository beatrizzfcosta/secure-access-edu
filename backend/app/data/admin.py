"""Operações de administração (utilizadores e papéis) — requer PostgreSQL."""

from __future__ import annotations

import uuid
from typing import Any

from app.db import get_connection


def _require_uuid(user_id: str) -> uuid.UUID:
    try:
        return uuid.UUID(str(user_id))
    except ValueError as exc:
        raise ValueError("invalid_user_id") from exc


def list_roles(dsn: str) -> list[dict[str, Any]]:
    with get_connection(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, name FROM roles ORDER BY name
                """
            )
            rows = cur.fetchall()
    return [{"id": str(r[0]), "name": r[1]} for r in rows]


def list_users_with_roles(dsn: str) -> list[dict[str, Any]]:
    with get_connection(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT u.id, u.username, u.email, u.is_blocked,
                       COALESCE(m.totp_enabled, FALSE),
                       COALESCE(
                           (
                               SELECT json_agg(r2.name ORDER BY r2.name)
                               FROM user_roles ur2
                               JOIN roles r2 ON r2.id = ur2.role_id
                               WHERE ur2.user_id = u.id
                           ),
                           '[]'::json
                       )
                FROM users u
                LEFT JOIN user_mfa_settings m ON m.user_id = u.id
                ORDER BY u.username
                """
            )
            rows = cur.fetchall()

    out: list[dict[str, Any]] = []
    for uid, username, email, is_blocked, totp_enabled, roles_json in rows:
        roles = roles_json if isinstance(roles_json, list) else []
        out.append(
            {
                "id": str(uid),
                "username": username,
                "email": email,
                "is_blocked": bool(is_blocked),
                "otp_enabled": bool(totp_enabled),
                "roles": roles,
            }
        )
    return out


def replace_user_roles(dsn: str, user_id: str, role_names: list[str]) -> None:
    names = sorted({str(n).strip() for n in role_names if str(n).strip()})
    if not names:
        raise ValueError("roles_required")

    uid = _require_uuid(user_id)

    with get_connection(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM users WHERE id = %s", (uid,))
            if not cur.fetchone():
                raise ValueError("user_not_found")

            placeholders = ",".join(["%s"] * len(names))
            cur.execute(
                f"SELECT id, name FROM roles WHERE name IN ({placeholders})",
                names,
            )
            found = {r[1]: r[0] for r in cur.fetchall()}
            if len(found) != len(names):
                raise ValueError("invalid_role")

            cur.execute("DELETE FROM user_roles WHERE user_id = %s", (uid,))
            for name in names:
                cur.execute(
                    """
                    INSERT INTO user_roles (user_id, role_id)
                    VALUES (%s, %s)
                    """,
                    (uid, found[name]),
                )


def create_user_as_admin(
    dsn: str,
    username: str,
    password_hash: str,
    email: str,
    role_names: list[str],
    created_by_user_id: str | None,
) -> str:
    """Insere utilizador com papéis e created_by (admin). Levanta UniqueViolation em duplicados."""
    names = sorted({str(n).strip() for n in role_names if str(n).strip()})
    if not names:
        raise ValueError("roles_required")

    admin_uuid: uuid.UUID | None = None
    if created_by_user_id:
        try:
            admin_uuid = uuid.UUID(str(created_by_user_id))
        except ValueError:
            admin_uuid = None

    with get_connection(dsn) as conn:
        with conn.cursor() as cur:
            placeholders = ",".join(["%s"] * len(names))
            cur.execute(
                f"SELECT id, name FROM roles WHERE name IN ({placeholders})",
                names,
            )
            found = {r[1]: r[0] for r in cur.fetchall()}
            if len(found) != len(names):
                raise ValueError("invalid_role")

            cur.execute(
                """
                INSERT INTO users (username, password_hash, email, created_by)
                VALUES (%s, %s, %s, %s)
                RETURNING id
                """,
                (username, password_hash, email, admin_uuid),
            )
            new_id = cur.fetchone()[0]

            for name in names:
                cur.execute(
                    """
                    INSERT INTO user_roles (user_id, role_id)
                    VALUES (%s, %s)
                    """,
                    (new_id, found[name]),
                )

    return str(new_id)


def delete_user_by_id(dsn: str, user_id: str) -> None:
    """Apaga utilizador. Falha com ForeignKeyViolation se existir tarefa created_by/assigned_by."""
    uid = _require_uuid(user_id)
    with get_connection(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM users WHERE id = %s", (uid,))
            if cur.rowcount == 0:
                raise ValueError("user_not_found")
