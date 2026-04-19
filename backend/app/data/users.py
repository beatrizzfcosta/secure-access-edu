from psycopg.rows import dict_row

from app.db import get_connection


_USER_SELECT = """
SELECT
    u.id::text AS id,
    u.username,
    u.password_hash AS password,
    u.email,
    u.is_blocked,
    u.failed_login_count,
    u.locked_until,
    COALESCE(r.name, 'student') AS role,
    COALESCE(m.totp_enabled, FALSE) AS otp_enabled,
    CASE
        WHEN m.totp_secret_encrypted IS NULL THEN NULL
        ELSE convert_from(m.totp_secret_encrypted, 'UTF8')
    END AS otp_secret
FROM users u
LEFT JOIN user_roles ur ON ur.user_id = u.id
LEFT JOIN roles r ON r.id = ur.role_id
LEFT JOIN user_mfa_settings m ON m.user_id = u.id
"""


def get_user_by_username(username):
    query = _USER_SELECT + " WHERE u.username = %s LIMIT 1"
    with get_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(query, (username,))
            return cur.fetchone()


def get_user_by_id(user_id):
    query = _USER_SELECT + " WHERE u.id = %s::uuid LIMIT 1"
    with get_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(query, (user_id,))
            return cur.fetchone()


def create_user(username, password_hash, email, role="student", created_by=None):
    with get_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                INSERT INTO users (username, password_hash, email, created_by)
                VALUES (%s, %s, %s, %s::uuid)
                RETURNING id::text AS id
                """,
                (username, password_hash, email, created_by),
            )
            created = cur.fetchone()

            cur.execute("SELECT id FROM roles WHERE name = %s", (role,))
            role_row = cur.fetchone()
            if role_row:
                cur.execute(
                    """
                    INSERT INTO user_roles (user_id, role_id)
                    VALUES (%s::uuid, %s)
                    ON CONFLICT DO NOTHING
                    """,
                    (created["id"], role_row["id"]),
                )

    return get_user_by_id(created["id"])


def count_users():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM users")
            return cur.fetchone()[0]


def register_failed_login(username, max_attempts=5, lock_minutes=15):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE users
                SET
                    failed_login_count = failed_login_count + 1,
                    last_failed_login_at = NOW(),
                    locked_until = CASE
                        WHEN failed_login_count + 1 >= %s THEN NOW() + (%s || ' minutes')::interval
                        ELSE locked_until
                    END
                WHERE username = %s
                """,
                (max_attempts, lock_minutes, username),
            )


def reset_failed_logins(user_id):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE users
                SET
                    failed_login_count = 0,
                    locked_until = NULL,
                    last_failed_login_at = NULL
                WHERE id = %s::uuid
                """,
                (user_id,),
            )


def store_user_mfa_secret(user_id, otp_secret):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO user_mfa_settings (
                    user_id,
                    totp_enabled,
                    totp_secret_encrypted,
                    updated_at
                )
                VALUES (%s::uuid, FALSE, convert_to(%s, 'UTF8'), NOW())
                ON CONFLICT (user_id) DO UPDATE
                SET totp_secret_encrypted = EXCLUDED.totp_secret_encrypted,
                    updated_at = NOW()
                """,
                (user_id, otp_secret),
            )


def enable_user_mfa(user_id):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE user_mfa_settings
                SET totp_enabled = TRUE,
                    enrolled_at = COALESCE(enrolled_at, NOW()),
                    updated_at = NOW()
                WHERE user_id = %s::uuid
                """,
                (user_id,),
            )