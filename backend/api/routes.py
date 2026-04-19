import base64
import io
import uuid
from datetime import datetime, timezone

from flask import Blueprint, request, jsonify, current_app
import qrcode

from auth.service import (
    generate_access_token,
    generate_refresh_token,
    authenticate_user,
    hash_password,
    verify_otp,
)
from auth.service import require_auth
from rbac.service import require_roles

from app.data.users import (
    get_user_by_username,
    get_user_by_id,
    create_user,
    count_users,
    register_failed_login,
    reset_failed_logins,
    store_user_mfa_secret,
    enable_user_mfa,
)
from app.data.tasks import (
    get_tasks as get_tasks_data,
    create_task as create_task_data,
    get_task_by_id,
    update_task as update_task_data,
    delete_task as delete_task_data,
    assign_task as assign_task_data,
)
from app.data.audit_logs import create_audit_log

from observability.logger import log_info, audit_log, log_security_event

from app.db import ping_database

import pyotp

api = Blueprint("api", __name__)


def _is_valid_uuid(value):
    try:
        uuid.UUID(str(value))
        return True
    except (ValueError, TypeError):
        return False


def _record_audit(action, user_id=None, details=None, resource_type=None, resource_id=None):
    audit_log(action, user_id, details)
    try:
        create_audit_log(
            event_type=action,
            user_id=user_id,
            details=details,
            ip_address=request.remote_addr,
            resource_type=resource_type,
            resource_id=resource_id,
        )
    except Exception as exc:
        log_security_event("ERROR", f"Audit log DB write failed: {exc}", str(user_id or "ANONYMOUS"))


@api.route("/health/db", methods=["GET"])
def health_db():
    dsn = current_app.config.get("DATABASE_URL")
    if not dsn:
        log_security_event("WARNING", "DATABASE_URL not set on /health/db")
        return jsonify({"status": "error", "detail": "DATABASE_URL not set"}), 503
    try:
        ping_database(dsn)
    except Exception as exc:
        log_security_event("ERROR", f"DB health check failed: {exc}")
        return jsonify({"status": "error", "detail": str(exc)}), 503
    log_info(request.method, "system", "Database health check succeeded")
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

    if user and user.get("is_blocked"):
        log_security_event("WARNING", "Blocked user attempted login", username)
        _record_audit("login_blocked", user.get("id"), {"username": username})
        return jsonify({"error": "User is blocked"}), 403

    if user and user.get("locked_until") and user["locked_until"] > datetime.now(timezone.utc):
        log_security_event("WARNING", "Locked user attempted login", username)
        _record_audit("login_locked", user.get("id"), {"username": username, "locked_until": str(user["locked_until"])})
        return jsonify({"error": "Account temporarily locked"}), 423

    user = authenticate_user(user, password)

    if not user:
        register_failed_login(username)
        log_info(request.method, username, f"Login failed for {username}")
        _record_audit("login_failed", None, {"username": username})
        return jsonify({"error": "Invalid credentials"}), 401

    reset_failed_logins(user["id"])
    
    if user.get("otp_enabled"):
        otp_code = data.get("otp")
        if not otp_code:
            return {"error": "OTP required"}, 401

        if not verify_otp(user, otp_code):
            return {"error": "Invalid OTP"}, 401
    
    access_token = generate_access_token(user)
    refresh_token = generate_refresh_token(user)

    log_info(request.method, username, f"Login successful for {username}")
    _record_audit("login_success", user["id"], {"username": username})

    return jsonify(
        {
            "token": access_token,
            "access_token": access_token,
            "refresh_token": refresh_token,
        }
    ), 200

@api.route("/tasks", methods=["GET"])
@require_auth
@require_roles("student", "teacher", "admin")
def get_tasks():
    user = request.user
    log_info(request.method, user.get("username", user.get("user_id")), "Fetching tasks")
    tasks = get_tasks_data(user["user_id"], user.get("role"))
    _record_audit("TASKS_FETCH", user["user_id"], {"count": len(tasks)})

    return jsonify({
        "msg": "tasks fetched",
        "user": user,
        "tasks": tasks
    })

@api.route("/tasks", methods=["POST"])
@require_auth
@require_roles("teacher", "admin")
def create_task():
    log_info(request.method, request.user["user_id"], "Create task request")
    data = request.get_json(silent=True)
    if not data:
        log_security_event("WARNING", "Invalid JSON on task creation", request.user["user_id"])
        return {"error": "Invalid JSON"}, 400

    if not data.get("title"):
        log_security_event("WARNING", "Task creation without title", request.user["user_id"])
        return {"error": "title is required"}, 400

    _record_audit("CREATE_TASK_ATTEMPT", request.user["user_id"], data)
    task = create_task_data(data, request.user["user_id"])

    _record_audit("CREATE_TASK", request.user["user_id"], data, resource_type="task", resource_id=task["id"])
    return jsonify(task)


@api.route("/tasks/<task_id>/assign", methods=["POST"])
@require_auth
@require_roles("teacher", "admin")
def assign_task(task_id):
    log_info(request.method, request.user["user_id"], f"Assign task {task_id}")

    if not _is_valid_uuid(task_id):
        log_security_event("WARNING", "Invalid task id format on ASSIGN", request.user["user_id"])
        return {"error": "Invalid task id"}, 400

    data = request.get_json(silent=True)
    if not data:
        log_security_event("WARNING", "Assign task with invalid JSON", request.user["user_id"])
        return {"error": "Invalid JSON"}, 400

    assignee_user_id = data.get("user_id")
    if not assignee_user_id or not _is_valid_uuid(assignee_user_id):
        return {"error": "Valid user_id is required"}, 400

    task = get_task_by_id(task_id, request.user["user_id"], request.user.get("role"))
    if not task:
        log_security_event("WARNING", f"Task assign denied or not found: {task_id}", request.user["user_id"])
        return {"error": "Task not found"}, 404

    assignee = get_user_by_id(assignee_user_id)
    if not assignee:
        return {"error": "Assignee not found"}, 404

    assignment = assign_task_data(task_id, assignee_user_id, request.user["user_id"])
    if not assignment:
        return {"message": "Task already assigned"}, 200

    _record_audit(
        "TASK_ASSIGNED",
        request.user["user_id"],
        {"task_id": task_id, "assignee_user_id": assignee_user_id},
        resource_type="task",
        resource_id=task_id,
    )
    return jsonify(assignment), 201


@api.route("/2fa/setup", methods=["GET"])
@require_auth
def setup_2fa():
    log_info(request.method, request.user["user_id"], "2FA setup requested")
    user = get_user_by_id(request.user["user_id"])
    if not user:
        log_security_event("WARNING", "2FA setup for unknown user", request.user["user_id"])
        return {"error": "User not found"}, 404

    otp_secret = user.get("otp_secret") or pyotp.random_base32()
    if not user.get("otp_secret"):
        store_user_mfa_secret(user["id"], otp_secret)
    
    totp = pyotp.TOTP(otp_secret)

    uri = totp.provisioning_uri(
        name=user["username"],
        issuer_name="SecureEdu"
    )

    qr = qrcode.make(uri)
    buffer = io.BytesIO()
    qr.save(buffer, format="PNG")

    qr_base64 = base64.b64encode(buffer.getvalue()).decode()
    
    _record_audit("MFA_SETUP_QR", request.user["user_id"], {"username": user["username"]})
    return {"qr": qr_base64}

@api.route("/2fa/verify", methods=["POST"])
@require_auth
def verify_2fa():
    log_info(request.method, request.user["user_id"], "2FA verify requested")
    data = request.json
    if not data:
        log_security_event("WARNING", "2FA verify with missing JSON", request.user["user_id"])
        return {"error": "Missing JSON"}, 400
    
    code = data.get("otp")
    if not code:
        log_security_event("WARNING", "2FA verify without OTP", request.user["user_id"])
        return {"error": "OTP required"}, 400

    user = get_user_by_id(request.user["user_id"])
    if not user:
        log_security_event("WARNING", "2FA verify for unknown user", request.user["user_id"])
        return {"error": "User not found"}, 404

    if not user.get("otp_secret"):
        log_security_event("WARNING", "2FA verify attempted before setup", request.user["user_id"])
        return {"error": "2FA setup required"}, 400

    totp = pyotp.TOTP(user["otp_secret"])

    if not totp.verify(code):
        log_security_event("WARNING", "Invalid OTP during 2FA verification", request.user["user_id"])
        return {"error": "Invalid OTP"}, 400

    enable_user_mfa(user["id"])
    _record_audit("MFA_ENABLED", request.user["user_id"], {"username": user["username"]})

    return {"message": "2FA enabled"}

@api.route("/me", methods=["GET"])
@require_auth
def me():
    log_info(request.method, request.user["user_id"], "Profile fetched")
    return jsonify(request.user)

@api.route("/bootstrap/register", methods=["POST"])
def bootstrap_register():
    if count_users() > 0:
        log_security_event("WARNING", "Bootstrap register attempted after initialization")
        return {"error": "Bootstrap is disabled"}, 403

    data = request.get_json(silent=True)
    if not data:
        return {"error": "Invalid JSON"}, 400

    username = data.get("username")
    password = data.get("password")
    email = data.get("email")

    if not username or not password or not email:
        return {"error": "Username, password and email required"}, 400

    user = create_user(
        username=username,
        password_hash=hash_password(password),
        email=email,
        role="admin",
    )
    _record_audit("BOOTSTRAP_ADMIN_CREATED", user["id"], {"username": username, "email": email})
    return {"message": "Bootstrap admin created", "id": user["id"]}, 201

@api.route("/register", methods=["POST"])
@require_auth
@require_roles("admin")
def register():
    log_info(request.method, request.user["user_id"], "User registration requested")
    data = request.get_json(silent=True)

    if not data:
        log_security_event("WARNING", "Register with invalid JSON")
        return {"error": "Invalid JSON"}, 400

    username = data.get("username")
    password = data.get("password")
    email = data.get("email")

    if not username or not password or not email:
        log_security_event("WARNING", "Register missing required fields")
        return {"error": "Username, password and email required"}, 400

    if get_user_by_username(username):
        log_security_event("WARNING", f"Register duplicate username: {username}")
        return {"error": "User already exists"}, 400

    role = data.get("role", "student")
    if role not in {"student", "teacher", "admin"}:
        return {"error": "Invalid role"}, 400

    user = create_user(
        username=username,
        password_hash=hash_password(password),
        email=email,
        role=role,
        created_by=request.user["user_id"],
    )
    _record_audit("USER_REGISTERED", user["id"], {"username": username, "email": email, "role": role})

    return {"message": "User created", "id": user["id"]}, 201

@api.route("/tasks/<task_id>", methods=["GET"])
@require_auth
def get_task(task_id):
    log_info(request.method, request.user["user_id"], f"Fetch task {task_id}")
    if not _is_valid_uuid(task_id):
        log_security_event("WARNING", "Invalid task id format on GET", request.user["user_id"])
        return {"error": "Invalid task id"}, 400

    task = get_task_by_id(task_id, request.user["user_id"], request.user.get("role"))

    if not task:
        log_security_event("WARNING", f"Task not found or unauthorized: {task_id}", request.user["user_id"])
        return {"error": "Task not found"}, 404

    _record_audit("TASK_FETCH", request.user["user_id"], {"task_id": task_id})

    return jsonify(task)

@api.route("/tasks/<task_id>", methods=["PUT"])
@require_auth
@require_roles("teacher", "admin")
def update_task(task_id):
    log_info(request.method, request.user["user_id"], f"Update task {task_id}")
    if not _is_valid_uuid(task_id):
        log_security_event("WARNING", "Invalid task id format on UPDATE", request.user["user_id"])
        return {"error": "Invalid task id"}, 400

    data = request.get_json(silent=True)

    if not data:
        log_security_event("WARNING", "Update task with invalid JSON", request.user["user_id"])
        return {"error": "Invalid JSON"}, 400

    task = update_task_data(
        task_id,
        data,
        request.user["user_id"],
        request.user.get("role"),
    )

    if not task:
        log_security_event("WARNING", f"Task update denied or not found: {task_id}", request.user["user_id"])
        return {"error": "Task not found"}, 404

    _record_audit("TASK_UPDATED", request.user["user_id"], {"task_id": task_id, "data": data})

    return jsonify(task)

@api.route("/tasks/<task_id>", methods=["DELETE"])
@require_auth
@require_roles("teacher", "admin")
def delete_task(task_id):
    log_info(request.method, request.user["user_id"], f"Delete task {task_id}")
    if not _is_valid_uuid(task_id):
        log_security_event("WARNING", "Invalid task id format on DELETE", request.user["user_id"])
        return {"error": "Invalid task id"}, 400

    deleted = delete_task_data(
        task_id,
        request.user["user_id"],
        request.user.get("role"),
    )
    if not deleted:
        log_security_event("WARNING", f"Task delete denied or not found: {task_id}", request.user["user_id"])
        return {"error": "Task not found"}, 404

    _record_audit("TASK_DELETED", request.user["user_id"], {"task_id": task_id})

    return {"message": "Task deleted"}