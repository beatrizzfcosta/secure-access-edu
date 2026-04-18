import base64
import io

from flask import Blueprint, request, jsonify
import qrcode

from auth.service import generate_token, authenticate_user, verify_otp
from auth.service import require_auth
from rbac.service import require_roles

from app.data.users import get_user_by_username, get_user_by_id
from app.data.tasks import get_tasks, create_task as create_task_data

from observability.logger import log_info, audit_log

import pyotp

api = Blueprint("api", __name__)

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
    
    if user.get("otp_enabled"):
        otp_code = data.get("otp")
        if not otp_code:
            return {"error": "OTP required"}, 401

        if not verify_otp(user, otp_code):
            return {"error": "Invalid OTP"}, 401
    
    token = generate_token(user)

    log_info(request.method, username, f"Login successful for {username}")
    audit_log("login_success", user=username)

    return jsonify({"token": token}), 200

@api.route("/tasks", methods=["GET"])
@require_auth
@require_roles("student", "teacher", "admin")
def get_tasks():
    user = request.user

    return jsonify({
        "msg": "tasks fetched",
        "user": user
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

    if not user.get("otp_secret"):
        user["otp_secret"] = pyotp.random_base32()
        user["otp_enabled"] = False
    
    totp = pyotp.TOTP(user["otp_secret"])

    uri = totp.provisioning_uri(
        name=user["username"],
        issuer_name="SecureEdu"
    )

    qr = qrcode.make(uri)
    buffer = io.BytesIO()
    qr.save(buffer, format="PNG")

    qr_base64 = base64.b64encode(buffer.getvalue()).decode()
    

    return {"qr": qr_base64}

@api.route("/2fa/verify", methods=["POST"])
@require_auth
def verify_2fa():
    data = request.json
    if not data:
        return {"error": "Missing JSON"}, 400
    
    code = data.get("otp")
    if not code:
        return {"error": "OTP required"}, 400

    user = get_user_by_id(request.user["user_id"])

    totp = pyotp.TOTP(user["otp_secret"])

    if not totp.verify(code):
        return {"error": "Invalid OTP"}, 400

    user["otp_enabled"] = True

    return {"message": "2FA enabled"}