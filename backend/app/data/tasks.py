
from psycopg.rows import dict_row

from app.db import get_connection


def _build_role_filter(role, user_id):
    if role == "admin":
        return "", ()

    if role == "teacher":
        return " AND t.created_by = %s::uuid", (user_id,)

    if role == "student":
        return (
            """
            AND EXISTS (
                SELECT 1
                FROM task_assignments ta
                WHERE ta.task_id = t.id
                  AND ta.user_id = %s::uuid
            )
            """,
            (user_id,),
        )

    return " AND FALSE", ()


def get_tasks(user_id, role):
    role_filter, params = _build_role_filter(role, user_id)
    query = f"""
        SELECT
            t.id::text AS id,
            t.title,
            t.description,
            t.created_by::text AS created_by
        FROM tasks t
        WHERE TRUE
        {role_filter}
        ORDER BY t.id DESC
    """

    with get_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(query, params)
            return cur.fetchall()


def get_task_by_id(task_id, user_id, role):
    role_filter, params = _build_role_filter(role, user_id)
    query = f"""
        SELECT
            t.id::text AS id,
            t.title,
            t.description,
            t.created_by::text AS created_by
        FROM tasks t
        WHERE t.id = %s::uuid
        {role_filter}
        LIMIT 1
    """

    with get_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(query, (task_id, *params))
            return cur.fetchone()


def create_task(task, created_by):
    with get_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                INSERT INTO tasks (title, description, created_by)
                VALUES (%s, %s, %s::uuid)
                RETURNING id::text AS id, title, description, created_by::text AS created_by
                """,
                (
                    task.get("title"),
                    task.get("description"),
                    created_by,
                ),
            )
            return cur.fetchone()


def update_task(task_id, data, user_id, role):
    role_filter, params = _build_role_filter(role, user_id)
    query = f"""
        UPDATE tasks t
        SET
            title = COALESCE(%s, t.title),
            description = COALESCE(%s, t.description)
        WHERE t.id = %s::uuid
        {role_filter}
        RETURNING t.id::text AS id, t.title, t.description, t.created_by::text AS created_by
    """

    with get_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(query, (data.get("title"), data.get("description"), task_id, *params))
            return cur.fetchone()


def delete_task(task_id, user_id, role):
    role_filter, params = _build_role_filter(role, user_id)
    query = f"DELETE FROM tasks t WHERE t.id = %s::uuid {role_filter}"

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (task_id, *params))
            return cur.rowcount > 0


def assign_task(task_id, assignee_user_id, assigned_by):
    with get_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                INSERT INTO task_assignments (task_id, user_id, assigned_by)
                VALUES (%s::uuid, %s::uuid, %s::uuid)
                ON CONFLICT (task_id, user_id) DO NOTHING
                RETURNING id::text AS id, task_id::text AS task_id, user_id::text AS user_id
                """,
                (task_id, assignee_user_id, assigned_by),
            )
            return cur.fetchone()