"""Utilizadores: Postgres (DATABASE_URL / Supabase) ou lista em memória (sem DSN)."""

from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone

from auth.service import hash_password

from app.db import get_connection

_USERS_FALLBACK = [
    {
        "id": 1,
        "username": "admin",
        "password": hash_password("123"),
        "role": "admin",
        "otp_secret": None,
        "otp_enabled": False,
    }
]

ROLE_PRIORITY = ("admin", "teacher", "student")


def _dsn() -> str | None:
    return os.environ.get("DATABASE_URL")


def _pick_role(names: list[str]) -> str:
    names_set = set(names)
    for r in ROLE_PRIORITY:
        if r in names_set:
            return r
    return names[0] if names else "student"


def _decode_secret(blob: bytes | None) -> str | None:
    if blob is None:
        return None
    return blob.decode("utf-8")


def _row_to_user(cur, row) -> dict | None:
    (
        uid,
        uname,
        pwd_hash,
        is_blocked,
        failed_login_count,
        locked_until,
        totp_enabled,
        totp_blob,
    ) = row
    if is_blocked:
        return None

    cur.execute(
        """
        SELECT r.name FROM roles r
        INNER JOIN user_roles ur ON ur.role_id = r.id
        WHERE ur.user_id = %s
        """,
        (uid,),
    )
    role_names = [r[0] for r in cur.fetchall()]
    role = _pick_role(role_names)

    return {
        "id": str(uid),
        "username": uname,
        "password": pwd_hash,
        "role": role,
        "failed_login_count": int(failed_login_count or 0),
        "locked_until": locked_until,
        "otp_enabled": bool(totp_enabled),
        "otp_secret": _decode_secret(totp_blob),
        "source": "database",
    }


def _fetch_user_by_username(dsn: str, username: str) -> dict | None:
    with get_connection(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT u.id, u.username, u.password_hash, u.is_blocked,
                      u.failed_login_count,
                      u.locked_until,
                       COALESCE(m.totp_enabled, FALSE),
                       m.totp_secret_encrypted
                FROM users u
                LEFT JOIN user_mfa_settings m ON m.user_id = u.id
                WHERE LOWER(TRIM(u.username)) = LOWER(TRIM(%s))
                """,
                (username,),
            )
            row = cur.fetchone()
            if not row:
                return None
            return _row_to_user(cur, row)


def _fetch_user_by_id(dsn: str, user_id: str) -> dict | None:
    try:
        uid = uuid.UUID(str(user_id))
    except ValueError:
        return None

    with get_connection(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT u.id, u.username, u.password_hash, u.is_blocked,
                      u.failed_login_count,
                      u.locked_until,
                       COALESCE(m.totp_enabled, FALSE),
                       m.totp_secret_encrypted
                FROM users u
                LEFT JOIN user_mfa_settings m ON m.user_id = u.id
                WHERE u.id = %s
                """,
                (uid,),
            )
            row = cur.fetchone()
            if not row:
                return None
            return _row_to_user(cur, row)


def create_user_with_student_role(
    dsn: str, username: str, password_hash: str, email: str
) -> str:
    with get_connection(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO users (username, password_hash, email)
                VALUES (%s, %s, %s)
                RETURNING id
                """,
                (username, password_hash, email),
            )
            new_id = cur.fetchone()[0]

            cur.execute(
                """
                INSERT INTO user_roles (user_id, role_id)
                SELECT %s, r.id FROM roles r WHERE r.name = 'student'
                """,
                (new_id,),
            )
    return str(new_id)


def _upsert_totp_secret(dsn: str, user_id: str, secret_plain: str) -> None:
    uid = uuid.UUID(str(user_id))
    secret_bytes = secret_plain.encode("utf-8")
    with get_connection(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO user_mfa_settings (
                    user_id, totp_enabled, totp_secret_encrypted, updated_at
                )
                VALUES (%s, FALSE, %s, NOW())
                ON CONFLICT (user_id) DO UPDATE SET
                    totp_secret_encrypted = COALESCE(
                        user_mfa_settings.totp_secret_encrypted,
                        EXCLUDED.totp_secret_encrypted
                    ),
                    updated_at = NOW()
                """,
                (uid, secret_bytes),
            )


def _set_totp_enabled_db(dsn: str, user_id: str, enabled: bool) -> None:
    uid = uuid.UUID(str(user_id))
    with get_connection(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE user_mfa_settings
                SET totp_enabled = %s, updated_at = NOW()
                WHERE user_id = %s
                """,
                (enabled, uid),
            )


def get_user_by_username(username):
    dsn = _dsn()
    if dsn:
        return _fetch_user_by_username(dsn, username)
    for user in _USERS_FALLBACK:
        if user["username"] == username:
            return user
    return None


def get_user_by_id(user_id):
    dsn = _dsn()
    if dsn:
        return _fetch_user_by_id(dsn, user_id)
    for user in _USERS_FALLBACK:
        if str(user["id"]) == str(user_id):
            return user
    return None


def ensure_totp_secret(user_id, secret_plain: str) -> None:
    dsn = _dsn()
    if dsn:
        _upsert_totp_secret(dsn, user_id, secret_plain)
        return
    user = get_user_by_id(user_id)
    if user:
        user["otp_secret"] = secret_plain
        user["otp_enabled"] = False


def set_user_totp_enabled(user_id, enabled: bool) -> None:
    dsn = _dsn()
    if dsn:
        _set_totp_enabled_db(dsn, user_id, enabled)
        return
    user = get_user_by_id(user_id)
    if user:
        user["otp_enabled"] = enabled


def register_user_fallback(username: str, password_hash: str) -> None:
    uid = max((u["id"] for u in _USERS_FALLBACK), default=0) + 1
    _USERS_FALLBACK.append(
        {
            "id": uid,
            "username": username,
            "password": password_hash,
            "role": "student",
            "otp_secret": None,
            "otp_enabled": False,
        }
    )


def is_user_temporarily_locked(user: dict | None) -> bool:
    if not user:
        return False
    locked_until = user.get("locked_until")
    if not locked_until:
        return False
    now = datetime.now(timezone.utc)
    try:
        return locked_until > now
    except TypeError:
        # Defensive fallback for naive timestamps
        return locked_until.replace(tzinfo=timezone.utc) > now


def register_failed_login_attempt(
    user_id: str,
    *,
    max_attempts: int,
    lock_minutes: int,
) -> None:
    dsn = _dsn()
    if not dsn:
        return

    uid = uuid.UUID(str(user_id))
    with get_connection(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE users
                SET failed_login_count = failed_login_count + 1,
                    last_failed_login_at = NOW(),
                    locked_until = CASE
                        WHEN failed_login_count + 1 >= %s
                        THEN NOW() + (%s || ' minutes')::interval
                        ELSE locked_until
                    END
                WHERE id = %s
                """,
                (int(max_attempts), int(lock_minutes), uid),
            )


def reset_failed_login_state(user_id: str) -> None:
    dsn = _dsn()
    if not dsn:
        return

    uid = uuid.UUID(str(user_id))
    with get_connection(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE users
                SET failed_login_count = 0,
                    locked_until = NULL,
                    last_failed_login_at = NULL
                WHERE id = %s
                """,
                (uid,),
            )
