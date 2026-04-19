from datetime import datetime, timedelta, timezone
import uuid
import jwt
import pyotp

from flask import request, jsonify, current_app
from functools import wraps
from argon2 import PasswordHasher

ph = PasswordHasher()


def authenticate_user(user, password):
    if not user:
        return None

    password_hash = user.get("password") or user.get("password_hash")
    if not password_hash or not verify_password(password_hash, password):
        return None

    return user


def hash_password(password: str):
    return ph.hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    try:
        return ph.verify(password_hash, password)
    except Exception:
        return False


def generate_access_token(user):
    private_key = current_app.config["JWT_SECRET_KEY"]

    payload = {
        "user_id": user["id"],
        "username": user["username"],
        "role": user.get("role", "student"),
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=15)
    }

    return jwt.encode(payload, private_key, algorithm="HS256")


def generate_refresh_token(user):
    private_key = current_app.config["JWT_SECRET_KEY"]

    payload = {
        "user_id": user["id"],
        "username": user["username"],
        "role": user.get("role", "student"),
        "type": "refresh",
        "jti": str(uuid.uuid4()),
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }

    return jwt.encode(payload, private_key, algorithm="HS256")


def require_auth(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        private_key = current_app.config["JWT_SECRET_KEY"]
        token = request.headers.get("Authorization")

        if not token:
            return jsonify({"error": "Token missing"}), 401

        if token.startswith("Bearer "):
            token = token.split(" ")[1]

        try:
            data = jwt.decode(token, private_key, algorithms=["HS256"])

            if data.get("type") != "access":
                return jsonify({"error": "Invalid token type"}), 401

            request.user = data

        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401

        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401

        return f(*args, **kwargs)

    return wrapper


def verify_otp(user, code):
    if not user.get("otp_enabled"):
        return True

    if not code:
        return False

    totp = pyotp.TOTP(user["otp_secret"])
    return totp.verify(code, valid_window=1)


__all__ = [
    "authenticate_user",
    "hash_password",
    "verify_password",
    "generate_access_token",
    "generate_refresh_token",
    "require_auth",
    "verify_otp"
]