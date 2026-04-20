import base64
import io

from flask import Blueprint, request, jsonify, current_app
import qrcode

from auth.service import (
    generate_access_token,
    generate_refresh_token,
    authenticate_user,
    hash_password,
    verify_otp,
    login_requires_otp,
)
from auth.service import require_auth
from rbac.service import require_roles

from app.data.users import (
    get_user_by_username,
    get_user_by_id,
    ensure_totp_secret,
    set_user_totp_enabled,
    register_user_fallback,
    create_user_with_student_role,
)
from psycopg.errors import UniqueViolation, ForeignKeyViolation
from app.data.tasks import get_tasks as get_tasks_data, create_task as create_task_data
from app.data.admin import (
    list_users_with_roles,
    list_roles as list_roles_db,
    replace_user_roles,
    create_user_as_admin,
    delete_user_by_id,
)

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

    user = authenticate_user(get_user_by_username(username), password)

    if not user:
        log_info(request.method, username, f"Login failed for {username}")
        audit_log("login_failed", user=username)
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

    token = generate_access_token(user)

    log_info(request.method, username, f"Login successful for {username}")
    audit_log("login_success", user=username)

    return jsonify(
        {
            "token": token,
            "user": {
                "user_id": user["id"],
                "username": user["username"],
                "role": user["role"],
            },
        }
    ), 200

@api.route("/tasks", methods=["GET"])
@require_auth
@require_roles("student", "teacher", "admin")
def get_tasks():
    user = request.user
    tasks = get_tasks_data()

    return jsonify({
        "msg": "tasks fetched",
        "user": user,
        "tasks": tasks
    })

@api.route("/tasks", methods=["POST"])
@require_auth
@require_roles("teacher", "admin")
def create_task():
    data = request.json
    audit_log("CREATE_TASK_ATTEMPT", request.user["user_id"], data)
    task = create_task_data(data)

    audit_log("CREATE_TASK", request.user["user_id"], data)
    return jsonify(task)


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


@api.route("/admin/users/<uuid:user_id>", methods=["DELETE"])
@require_auth
@require_roles("admin")
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

@api.route("/tasks/<int:task_id>", methods=["GET"])
@require_auth
def get_task(task_id):
    task = next((t for t in get_tasks_data() if t["id"] == task_id), None)

    if not task:
        return {"error": "Task not found"}, 404

    return jsonify(task)

@api.route("/tasks/<int:task_id>", methods=["PUT"])
@require_auth
@require_roles("teacher", "admin")
def update_task(task_id):
    data = request.get_json(silent=True)

    if not data:
        return {"error": "Invalid JSON"}, 400

    tasks = get_tasks_data()
    task = next((t for t in tasks if t["id"] == task_id), None)

    if not task:
        return {"error": "Task not found"}, 404

    task.update(data)

    return jsonify(task)

@api.route("/tasks/<int:task_id>", methods=["DELETE"])
@require_auth
@require_roles("admin")
def delete_task(task_id):
    tasks = get_tasks_data()
    task = next((t for t in tasks if t["id"] == task_id), None)

    if not task:
        return {"error": "Task not found"}, 404

    tasks.remove(task)

    return {"message": "Task deleted"}