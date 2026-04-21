from datetime import datetime, timedelta, timezone
import uuid
import jwt
import pyotp

from flask import request, jsonify, current_app
from functools import wraps
from argon2 import PasswordHasher

from app.data.sessions import refresh_session_activity

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


def generate_access_token(user, *, session_id: str | None = None):
    private_key = current_app.config["JWT_SECRET_KEY"]

    payload = {
        "user_id": user["id"],
        "username": user["username"],
        "role": user["role"],
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=15)
    }

    if session_id:
        payload["sid"] = session_id

    return jwt.encode(payload, private_key, algorithm="HS256")


def generate_refresh_token(user, *, session_id: str | None = None):
    private_key = current_app.config["JWT_SECRET_KEY"]

    payload = {
        "user_id": user["id"],
        "username": user["username"],
        "role": user["role"],
        "type": "refresh",
        "jti": str(uuid.uuid4()),
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }

    if session_id:
        payload["sid"] = session_id

    return jwt.encode(payload, private_key, algorithm="HS256")


def decode_token(token: str, *, expected_type: str | None = None) -> dict:
    private_key = current_app.config["JWT_SECRET_KEY"]
    data = jwt.decode(token, private_key, algorithms=["HS256"])
    if expected_type and data.get("type") != expected_type:
        raise jwt.InvalidTokenError("Invalid token type")
    return data


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
            data = decode_token(token, expected_type="access")

            sid = data.get("sid")
            dsn = current_app.config.get("DATABASE_URL")
            if sid and dsn:
                inactivity_timeout = int(current_app.config.get("SESSION_INACTIVITY_TIMEOUT_MINUTES", 30))
                if not refresh_session_activity(
                    dsn,
                    session_id=str(sid),
                    inactivity_timeout_minutes=inactivity_timeout,
                ):
                    return jsonify({"error": "Session expired or inactive"}), 401

            request.user = data
            request.environ["DATABASE_URL"] = current_app.config.get("DATABASE_URL")

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
    "decode_token",
    "require_auth",
    "verify_otp",
    "login_requires_otp",
]