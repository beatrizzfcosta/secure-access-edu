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

    if not verify_password(user["password"], password):
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
        "role": user["role"],
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=15)
    }

    return jwt.encode(payload, private_key, algorithm="HS256")


def generate_refresh_token(user):
    private_key = current_app.config["JWT_SECRET_KEY"]

    payload = {
        "user_id": user["id"],
        "username": user["username"],
        "role": user["role"],
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


def _otp_code_digits(code) -> str:
    if code is None:
        return ""
    return "".join(c for c in str(code).strip() if c.isdigit())


def verify_otp(user, code):
    """Valida TOTP se existir segredo; sem segredo não há MFA no login."""
    secret = user.get("otp_secret")
    if not secret:
        return True

    digits = _otp_code_digits(code)
    if not digits:
        return False

    totp = pyotp.TOTP(str(secret).strip())
    return totp.verify(digits, valid_window=1)


def login_requires_otp(user) -> bool:
    """Exige OTP no login só depois do utilizador confirmar o primeiro código (totp_enabled).

    O GET /2fa/setup gera e guarda o segredo antes do enrollment; sem este check o login
    pediria 2FA só por terem aberto a página de configuração.
    """
    return bool(user.get("otp_secret")) and bool(user.get("otp_enabled"))


__all__ = [
    "authenticate_user",
    "hash_password",
    "verify_password",
    "generate_access_token",
    "generate_refresh_token",
    "require_auth",
    "verify_otp",
    "login_requires_otp",
]