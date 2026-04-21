from flask import request, jsonify
from functools import wraps

from app.db import get_connection


def _user_has_permissions(dsn: str, user_id: str, required: tuple[str, ...]) -> bool:
    if not required:
        return True
    with get_connection(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT DISTINCT p.name
                FROM permissions p
                JOIN role_permissions rp ON rp.permission_id = p.id
                JOIN user_roles ur ON ur.role_id = rp.role_id
                WHERE ur.user_id = %s::uuid
                """,
                (str(user_id),),
            )
            names = {r[0] for r in cur.fetchall()}
    return set(required).issubset(names)

def require_roles(*role):
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            user = getattr(request, "user", None)

            if not user:
                return jsonify({"error": "Unauthorized"}), 401
            
            if user.get("role") not in role:
                return jsonify({"error": "Forbidden"}), 403
        
            return f(*args, **kwargs)
        return wrapper
    return decorator


def require_permissions(*permissions):
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            user = getattr(request, "user", None)
            if not user:
                return jsonify({"error": "Unauthorized"}), 401

            dsn = request.environ.get("DATABASE_URL")
            if not dsn:
                return jsonify({"error": "RBAC requires DATABASE_URL"}), 503

            if not _user_has_permissions(dsn, str(user.get("user_id")), tuple(permissions)):
                return jsonify({"error": "Forbidden"}), 403

            return f(*args, **kwargs)

        return wrapper

    return decorator