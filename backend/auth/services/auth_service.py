from .hash_service import hash_password, verify_password
from .jwt_service import (
    sign_access_token,
    sign_refresh_token,
    verify_refresh_token
)
from .totp_service import (
    generate_secret,
    verify_token
)

import time
import uuid


_users = {}
_sessions = {}


def _next_id() -> str:
    return str(uuid.uuid4())


def register_user(
    username: str,
    password: str,
    enable_mfa: bool = False,
    issuer: str = "secure-access-edu"
) -> dict:

    if username in _users:
        raise ValueError("USER_EXISTS")

    uid = _next_id()

    user = {
        "id": uid,
        "username": username,
        "password": hash_password(password),
        "role": "student",
        "otp_enabled": False,
        "otp_secret": None
    }

    if enable_mfa:
        secret_data = generate_secret(
            name=username,
            issuer=issuer
        )

        user["otp_secret"] = secret_data["secret"]
        user["otpauth_url"] = secret_data["otpauth_url"]
        user["otp_enabled"] = True

    _users[username] = user

    return {
        "id": uid,
        "username": username
    }


def login_user(
    username: str,
    password: str,
    otp_code: str = None
) -> dict:

    user = _users.get(username)

    if not user:
        raise ValueError("INVALID_CREDENTIALS")

    if not verify_password(user["password"], password):
        raise ValueError("INVALID_CREDENTIALS")

    if user.get("otp_enabled"):
        if not otp_code:
            raise ValueError("OTP_REQUIRED")

        if not verify_token(
            token=otp_code,
            secret=user["otp_secret"]
        ):
            raise ValueError("INVALID_OTP")

    access_token = sign_access_token({
        "sub": user["id"],
        "username": user["username"],
        "role": user["role"]
    })

    refresh_result = sign_refresh_token({
        "sub": user["id"],
        "username": user["username"],
        "role": user["role"]
    })

    #sessions.refresh_jti
    _sessions[user["id"]] = {
        "username": username,
        "refresh_jti": refresh_result["jti"],
        "created_at": time.time(),
        "is_active": True
    }

    return {
        "access_token": access_token,
        "refresh_token": refresh_result["token"]
    }


def refresh_tokens(refresh_token: str) -> dict:
    payload = verify_refresh_token(refresh_token)

    user_id = payload.get("sub")
    jti = payload.get("jti")

    if not user_id or not jti:
        raise ValueError("INVALID_REFRESH")

    session = _sessions.get(user_id)

    if not session:
        raise ValueError("SESSION_NOT_FOUND")

    if not session["is_active"]:
        raise ValueError("SESSION_INACTIVE")

    if session["refresh_jti"] != jti:
        raise ValueError("INVALID_REFRESH")

    username = session["username"]
    user = _users.get(username)

    if not user:
        raise ValueError("USER_NOT_FOUND")

    new_access_token = sign_access_token({
        "sub": user["id"],
        "username": user["username"],
        "role": user["role"]
    })

    new_refresh_result = sign_refresh_token({
        "sub": user["id"],
        "username": user["username"],
        "role": user["role"]
    })

    # rotation → substitui refresh_jti antigo
    session["refresh_jti"] = new_refresh_result["jti"]
    session["created_at"] = time.time()

    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_result["token"]
    }


def get_user_by_username(username: str):
    return _users.get(username)