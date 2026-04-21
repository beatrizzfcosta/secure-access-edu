import base64
import io

from flask import Blueprint, request, jsonify, current_app
import qrcode

from auth.service import (
    generate_access_token,
    generate_refresh_token,
    decode_token,
    authenticate_user,
    hash_password,
    verify_otp,
    login_requires_otp,
)
from auth.service import require_auth
from rbac.service import require_roles, require_permissions

from app.data.users import (
    get_user_by_username,
    get_user_by_id,
    is_user_temporarily_locked,
    register_failed_login_attempt,
    reset_failed_login_state,
    ensure_totp_secret,
    set_user_totp_enabled,
    register_user_fallback,
    create_user_with_student_role,
)
from psycopg.errors import UniqueViolation, ForeignKeyViolation
from app.data.tasks import (
    get_tasks_for_user,
    create_task as create_task_db,
    get_task_for_user,
    update_task as update_task_db,
    delete_task as delete_task_db,
    assign_task as assign_task_db,
    unassign_task as unassign_task_db,
)
from app.data.admin import (
    list_users_with_roles,
    list_roles as list_roles_db,
    replace_user_roles,
    create_user_as_admin,
    delete_user_by_id,
)
from app.data.sessions import create_session, revoke_session
from app.data.audit_logs import create_audit_log, list_audit_logs

from observability.logger import log_info, audit_log, log_security_event

from app.db import ping_database

import pyotp

api = Blueprint("api", __name__)


@api.route("/health/db", methods=["GET"])
def health_db():
    dsn = current_app.config.get("DATABASE_URL")
    if not dsn:
        return jsonify({"status": "error", "detail": "DATABASE_URL not set"}), 503
    try:
        ping_database(dsn)
    except Exception as exc:
        return jsonify({"status": "error", "detail": str(exc)}), 503
    return jsonify({"status": "ok", "database": "reachable"})

@api.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    if not data:
        return {"error": "LOGIN Missing JSON"}, 400
    
    
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return {"error": "Username and password required"}, 400

    log_info(request.method, username, f"Login attempt for {username}")

    user = get_user_by_username(username)

    if user and is_user_temporarily_locked(user):
        audit_log("login_blocked_lockout", user=username)
        try:
            create_audit_log("login_blocked_lockout", user_id=str(user.get("id")))
        except Exception:
            pass
        return jsonify({"error": "Account temporarily locked"}), 423

    user = authenticate_user(user, password)

    if not user:
        known_user = get_user_by_username(username)
        if known_user:
            register_failed_login_attempt(
                str(known_user["id"]),
                max_attempts=int(current_app.config.get("LOGIN_MAX_ATTEMPTS", 5)),
                lock_minutes=int(current_app.config.get("LOGIN_LOCK_MINUTES", 15)),
            )
        log_info(request.method, username, f"Login failed for {username}")
        audit_log("login_failed", user=username)
        try:
            create_audit_log("login_failed", user_id=str(known_user["id"]) if known_user else None)
        except Exception:
            pass
        return jsonify({"error": "Invalid credentials"}), 401

    if user.get("otp_enabled") and not user.get("otp_secret"):
        log_security_event(
            "ERROR",
            "MFA enabled without stored secret",
            user_id=str(user.get("id", "")),
        )
        return jsonify({"error": "MFA misconfigured for this account"}), 503

    if login_requires_otp(user):
        otp_code = data.get("otp")
        if not otp_code or not str(otp_code).strip():
            return jsonify({"error": "OTP required", "mfa_required": True}), 401

        if not verify_otp(user, otp_code):
            audit_log("login_failed_otp", user=username)
            return jsonify({"error": "Invalid OTP"}), 401

    reset_failed_login_state(str(user["id"]))

    dsn = current_app.config.get("DATABASE_URL")
    session_id = None
    if dsn:
        session_id = create_session(
            dsn,
            user_id=str(user["id"]),
            ttl_minutes=int(current_app.config.get("SESSION_TTL_MINUTES", 60 * 24 * 7)),
        )

    token = generate_access_token(user, session_id=session_id)
    refresh_token = generate_refresh_token(user, session_id=session_id)

    log_info(request.method, username, f"Login successful for {username}")
    audit_log("login_success", user=username)
    try:
        create_audit_log("login_success", user_id=str(user["id"]))
    except Exception:
        pass

    return jsonify(
        {
            "token": token,
            "refresh_token": refresh_token,
            "user": {
                "user_id": user["id"],
                "username": user["username"],
                "role": user["role"],
            },
        }
    ), 200


@api.route("/token/refresh", methods=["POST"])
def refresh_token():
    data = request.get_json(silent=True) or {}
    incoming = data.get("refresh_token")
    if not incoming:
        return jsonify({"error": "refresh_token required"}), 400

    try:
        payload = decode_token(str(incoming), expected_type="refresh")
    except Exception:
        return jsonify({"error": "Invalid refresh token"}), 401

    user = get_user_by_id(str(payload.get("user_id")))
    if not user:
        return jsonify({"error": "User not found"}), 404

    sid = payload.get("sid")
    token = generate_access_token(user, session_id=str(sid) if sid else None)
    new_refresh = generate_refresh_token(user, session_id=str(sid) if sid else None)
    return jsonify({"token": token, "refresh_token": new_refresh}), 200


@api.route("/logout", methods=["POST"])
@require_auth
def logout():
    sid = request.user.get("sid")
    dsn = current_app.config.get("DATABASE_URL")
    if sid and dsn:
        revoke_session(dsn, session_id=str(sid))
    return jsonify({"message": "Logged out"}), 200

@api.route("/tasks", methods=["GET"])
@require_auth
@require_roles("student", "teacher", "admin")
@require_permissions("task.read")
def get_tasks():
    user = request.user
    dsn = current_app.config.get("DATABASE_URL")
    if not dsn:
        return jsonify({"error": "Gestão de tarefas requer base de dados"}), 503

    try:
        tasks = get_tasks_for_user(
            dsn,
            user_id=str(user["user_id"]),
            role=str(user["role"]),
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500

    return jsonify({
        "msg": "tasks fetched",
        "user": user,
        "tasks": tasks
    })


def _validate_task_payload(data, *, partial: bool = False):
    if not isinstance(data, dict):
        raise ValueError("invalid_json")

    has_title = "title" in data
    has_description = "description" in data

    if partial and not has_title and not has_description:
        raise ValueError("no_fields_to_update")

    if not partial and not has_title:
        raise ValueError("title_required")

    out = {}

    if has_title:
        title = data.get("title")
        if title is None:
            raise ValueError("title_required")
        title = str(title).strip()
        if not title:
            raise ValueError("title_required")
        if len(title) > 500:
            raise ValueError("title_too_long")
        out["title"] = title

    if has_description:
        description = data.get("description")
        if description is None:
            out["description"] = None
        else:
            description = str(description).strip()
            if len(description) > 5000:
                raise ValueError("description_too_long")
            out["description"] = description or None

    if not partial and "description" not in out:
        out["description"] = None

    return out

@api.route("/tasks", methods=["POST"])
@require_auth
@require_roles("teacher", "admin")
@require_permissions("task.create")
def create_task():
    dsn = current_app.config.get("DATABASE_URL")
    if not dsn:
        return jsonify({"error": "Gestão de tarefas requer base de dados"}), 503

    data = request.get_json(silent=True)
    try:
        payload = _validate_task_payload(data, partial=False)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    audit_log("CREATE_TASK_ATTEMPT", request.user["user_id"], payload)
    try:
        task = create_task_db(
            dsn,
            title=payload["title"],
            description=payload.get("description"),
            created_by=str(request.user["user_id"]),
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500

    audit_log("CREATE_TASK", request.user["user_id"], task)
    return jsonify(task), 201


@api.route("/2fa/setup", methods=["GET"])
@require_auth
def setup_2fa():
    user = get_user_by_id(request.user["user_id"])
    if not user:
        return jsonify({"error": "User not found"}), 404

    secret = user.get("otp_secret")
    if not secret:
        secret = pyotp.random_base32()
        ensure_totp_secret(user["id"], secret)

    totp = pyotp.TOTP(secret)

    uri = totp.provisioning_uri(
        name=user["username"],
        issuer_name="SecureEdu"
    )

    qr = qrcode.make(uri)
    buffer = io.BytesIO()
    qr.save(buffer, format="PNG")

    qr_base64 = base64.b64encode(buffer.getvalue()).decode()
    

    return {"qr": qr_base64}

def _normalize_totp_code(raw) -> str | None:
    if raw is None:
        return None
    digits = "".join(c for c in str(raw).strip() if c.isdigit())
    return digits if digits else None


@api.route("/2fa/verify", methods=["POST"])
@require_auth
def verify_2fa():
    data = request.json
    if not data:
        return jsonify({"error": "Missing JSON"}), 400

    code = _normalize_totp_code(data.get("otp"))
    if not code:
        return jsonify({"error": "OTP required"}), 400

    user = get_user_by_id(request.user["user_id"])
    if not user or not user.get("otp_secret"):
        return jsonify({"error": "2FA not initialized"}), 400

    totp = pyotp.TOTP(str(user["otp_secret"]).strip())

    # Mesma tolerância de relógio que no login (±1 intervalo de 30s)
    if not totp.verify(code, valid_window=1):
        return jsonify({"error": "Invalid OTP"}), 400

    set_user_totp_enabled(user["id"], True)

    return jsonify({"message": "2FA enabled"})

@api.route("/me", methods=["GET"])
@require_auth
def me():
    return jsonify(request.user)


@api.route("/admin/users", methods=["GET"])
@require_auth
@require_roles("admin")
@require_permissions("user.update")
def admin_list_users():
    dsn = current_app.config.get("DATABASE_URL")
    if not dsn:
        return jsonify({"error": "Gestão de utilizadores requer base de dados"}), 503
    try:
        users = list_users_with_roles(dsn)
        return jsonify({"users": users})
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@api.route("/admin/users", methods=["POST"])
@require_auth
@require_roles("admin")
@require_permissions("user.create")
def admin_create_user():
    dsn = current_app.config.get("DATABASE_URL")
    if not dsn:
        return jsonify({"error": "Gestão de utilizadores requer base de dados"}), 503

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "JSON inválido"}), 400

    username = (data.get("username") or "").strip()
    password = data.get("password")
    email = (data.get("email") or "").strip()
    if not email and username:
        email = f"{username}@users.local"

    raw_roles = data.get("roles")
    if isinstance(raw_roles, list) and raw_roles:
        role_names = [str(r).strip() for r in raw_roles if str(r).strip()]
    else:
        role_names = ["student"]

    if not username or not password:
        return jsonify({"error": "username e password obrigatórios"}), 400

    if len(str(password)) < 6:
        return jsonify({"error": "Password demasiado curta (mín. 6 caracteres)"}), 400

    pwd_hash = hash_password(password)
    admin_id = request.user.get("user_id")

    try:
        new_id = create_user_as_admin(
            dsn,
            username,
            pwd_hash,
            email,
            role_names,
            str(admin_id) if admin_id else None,
        )
    except ValueError as exc:
        code = str(exc)
        if code == "roles_required":
            return jsonify({"error": "Indique pelo menos um papel"}), 400
        if code == "invalid_role":
            return jsonify({"error": "Um ou mais papéis são inválidos"}), 400
        return jsonify({"error": code}), 400
    except UniqueViolation:
        return jsonify({"error": "Utilizador ou email já existe"}), 400
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500

    audit_log(
        "user_created_by_admin",
        user=str(admin_id),
        details={"new_user_id": new_id, "username": username, "roles": role_names},
    )
    return jsonify({"message": "Utilizador criado", "user_id": new_id}), 201


@api.route("/admin/roles", methods=["GET"])
@require_auth
@require_roles("admin")
def admin_list_roles():
    dsn = current_app.config.get("DATABASE_URL")
    if not dsn:
        return jsonify({"error": "Gestão de papéis requer base de dados"}), 503
    try:
        roles = list_roles_db(dsn)
        return jsonify({"roles": roles})
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@api.route("/admin/logs", methods=["GET"])
@require_auth
@require_roles("admin")
@require_permissions("audit.read")
def admin_list_logs():
    try:
        limit_raw = request.args.get("limit", "100")
        limit = int(limit_raw)
    except ValueError:
        return jsonify({"error": "invalid_limit"}), 400

    event_type = request.args.get("event_type")
    user_id = request.args.get("user_id")

    try:
        logs = list_audit_logs(limit=limit, event_type=event_type, user_id=user_id)
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500

    return jsonify({"logs": logs, "count": len(logs)})


@api.route("/admin/users/<uuid:user_id>", methods=["DELETE"])
@require_auth
@require_roles("admin")
@require_permissions("user.update")
def admin_delete_user(user_id):
    dsn = current_app.config.get("DATABASE_URL")
    if not dsn:
        return jsonify({"error": "Gestão de utilizadores requer base de dados"}), 503

    if str(user_id) == str(request.user.get("user_id")):
        return jsonify({"error": "Não pode eliminar a sua própria conta"}), 400

    try:
        delete_user_by_id(dsn, str(user_id))
    except ValueError as exc:
        if str(exc) == "invalid_user_id":
            return jsonify({"error": "ID de utilizador inválido"}), 400
        if str(exc) == "user_not_found":
            return jsonify({"error": "Utilizador não encontrado"}), 404
        return jsonify({"error": str(exc)}), 400
    except ForeignKeyViolation:
        return jsonify(
            {
                "error": "Não é possível eliminar: o utilizador criou ou atribuiu tarefas. "
                "Apague ou reatribua essas tarefas primeiro (ou use SQL na BD).",
            }
        ), 409
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500

    audit_log(
        "user_deleted_by_admin",
        user=str(request.user.get("user_id")),
        details={"deleted_user_id": str(user_id)},
    )
    return jsonify({"message": "Utilizador eliminado"}), 200


@api.route("/admin/users/<uuid:user_id>/roles", methods=["PATCH"])
@require_auth
@require_roles("admin")
@require_permissions("user.manage_roles")
def admin_patch_user_roles(user_id):
    dsn = current_app.config.get("DATABASE_URL")
    if not dsn:
        return jsonify({"error": "Gestão de utilizadores requer base de dados"}), 503

    data = request.get_json(silent=True)
    if not data or not isinstance(data.get("roles"), list):
        return jsonify({"error": "Body JSON com lista 'roles' obrigatória"}), 400

    raw_roles = data["roles"]
    role_names = [str(r).strip() for r in raw_roles if str(r).strip()]
    try:
        replace_user_roles(dsn, str(user_id), role_names)
    except ValueError as exc:
        code = str(exc)
        if code == "user_not_found":
            return jsonify({"error": "Utilizador não encontrado"}), 404
        if code == "invalid_user_id":
            return jsonify({"error": "ID de utilizador inválido"}), 400
        if code in ("roles_required", "invalid_role"):
            return jsonify(
                {
                    "error": "Papéis inválidos ou lista vazia",
                    "detail": code,
                }
            ), 400
        return jsonify({"error": code}), 400
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500

    audit_log(
        "user_roles_updated",
        user=str(request.user.get("user_id")),
        details={"target_user": str(user_id), "roles": role_names},
    )
    return jsonify({"message": "Papéis atualizados", "roles": role_names})


@api.route("/register", methods=["POST"])
def register():
    data = request.get_json(silent=True)

    if not data:
        return {"error": "Invalid JSON"}, 400

    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return {"error": "Username and password required"}, 400

    if get_user_by_username(username):
        return {"error": "User already exists"}, 400

    pwd_hash = hash_password(password)
    dsn = current_app.config.get("DATABASE_URL")
    if dsn:
        email = (data.get("email") or "").strip() or f"{username}@users.local"
        try:
            create_user_with_student_role(dsn, username, pwd_hash, email)
        except UniqueViolation:
            return jsonify({"error": "User already exists"}), 400
        return jsonify({"message": "User created"}), 201

    register_user_fallback(username, pwd_hash)
    return jsonify({"message": "User created"}), 201

@api.route("/tasks/<uuid:task_id>", methods=["GET"])
@require_auth
@require_roles("student", "teacher", "admin")
@require_permissions("task.read")
def get_task(task_id):
    dsn = current_app.config.get("DATABASE_URL")
    if not dsn:
        return jsonify({"error": "Gestão de tarefas requer base de dados"}), 503

    task = get_task_for_user(
        dsn,
        task_id=str(task_id),
        requester_id=str(request.user["user_id"]),
        requester_role=str(request.user["role"]),
    )

    if not task:
        return {"error": "Task not found or access denied"}, 404

    return jsonify(task)


@api.route("/tasks/<uuid:task_id>", methods=["PUT"])
@require_auth
@require_roles("teacher", "admin")
@require_permissions("task.update")
def update_task(task_id):
    dsn = current_app.config.get("DATABASE_URL")
    if not dsn:
        return jsonify({"error": "Gestão de tarefas requer base de dados"}), 503

    data = request.get_json(silent=True)
    try:
        payload = _validate_task_payload(data, partial=True)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    try:
        task = update_task_db(
            dsn,
            task_id=str(task_id),
            requester_id=str(request.user["user_id"]),
            requester_role=str(request.user["role"]),
            title=payload.get("title"),
            description=payload.get("description"),
        )
    except PermissionError:
        return jsonify({"error": "Forbidden"}), 403
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500

    if not task:
        return {"error": "Task not found"}, 404

    audit_log("UPDATE_TASK", request.user["user_id"], {"task_id": str(task_id)})
    return jsonify(task)


@api.route("/tasks/<uuid:task_id>", methods=["DELETE"])
@require_auth
@require_roles("teacher", "admin")
@require_permissions("task.delete")
def delete_task(task_id):
    dsn = current_app.config.get("DATABASE_URL")
    if not dsn:
        return jsonify({"error": "Gestão de tarefas requer base de dados"}), 503

    try:
        deleted = delete_task_db(
            dsn,
            task_id=str(task_id),
            requester_id=str(request.user["user_id"]),
            requester_role=str(request.user["role"]),
        )
    except PermissionError:
        return jsonify({"error": "Forbidden"}), 403
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500

    if not deleted:
        return {"error": "Task not found"}, 404

    audit_log("DELETE_TASK", request.user["user_id"], {"task_id": str(task_id)})
    return {"message": "Task deleted"}, 200


@api.route("/tasks/<uuid:task_id>/assignments", methods=["POST"])
@require_auth
@require_roles("teacher", "admin")
@require_permissions("task.assign")
def create_task_assignment(task_id):
    dsn = current_app.config.get("DATABASE_URL")
    if not dsn:
        return jsonify({"error": "Gestão de tarefas requer base de dados"}), 503

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "invalid_json"}), 400

    assignee_user_id = data.get("user_id")
    if not assignee_user_id:
        return jsonify({"error": "user_id_required"}), 400

    try:
        assignment = assign_task_db(
            dsn,
            task_id=str(task_id),
            assignee_user_id=str(assignee_user_id),
            assigned_by_user_id=str(request.user["user_id"]),
            requester_role=str(request.user["role"]),
        )
    except PermissionError:
        return jsonify({"error": "Forbidden"}), 403
    except ValueError as exc:
        code = str(exc)
        if code in ("task_not_found", "assignee_not_found"):
            return jsonify({"error": code}), 404
        return jsonify({"error": code}), 400
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500

    audit_log("ASSIGN_TASK", request.user["user_id"], assignment)
    return jsonify({"assignment": assignment}), 201


@api.route("/tasks/<uuid:task_id>/assignments/<uuid:assignee_user_id>", methods=["DELETE"])
@require_auth
@require_roles("teacher", "admin")
@require_permissions("task.assign")
def delete_task_assignment(task_id, assignee_user_id):
    dsn = current_app.config.get("DATABASE_URL")
    if not dsn:
        return jsonify({"error": "Gestão de tarefas requer base de dados"}), 503

    try:
        removed = unassign_task_db(
            dsn,
            task_id=str(task_id),
            assignee_user_id=str(assignee_user_id),
            requester_id=str(request.user["user_id"]),
            requester_role=str(request.user["role"]),
        )
    except PermissionError:
        return jsonify({"error": "Forbidden"}), 403
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500

    if not removed:
        return jsonify({"error": "assignment_or_task_not_found"}), 404

    audit_log(
        "UNASSIGN_TASK",
        request.user["user_id"],
        {"task_id": str(task_id), "user_id": str(assignee_user_id)},
    )
    return jsonify({"message": "Assignment removed"}), 200