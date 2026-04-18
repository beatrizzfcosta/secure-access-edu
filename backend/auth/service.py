from datetime import datetime, timedelta, timezone
import os
import jwt
from argon2 import PasswordHasher
from flask import request, jsonify, current_app
from functools import wraps
import pyotp




ph = PasswordHasher()

def authenticate_user(user, password):
    if not user:
        return None
    if not verify_password(user["password"], password):
        return None
    return user

def generate_token(user):
    PRIVATE_KEY = current_app.config["JWT_SECRET_KEY"]
    print("SECRET:", current_app.config["JWT_SECRET_KEY"], type(current_app.config["JWT_SECRET_KEY"]))
    payload = {
        "user_id": user["id"],
        "role": user["role"],
        "exp": datetime.now(timezone.utc) + timedelta(hours=1)
    }
    return jwt.encode(payload, PRIVATE_KEY, algorithm="HS256")

def hash_password(password: str):
    return ph.hash(password)

def require_auth(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        PRIVATE_KEY = current_app.config["JWT_SECRET_KEY"]
        token = request.headers.get("Authorization")

        if not token:
            return jsonify({"error": "Token missing"}), 401
        
        if token.startswith("Bearer "):
            token = token.split(" ")[1]

        try:
            data = jwt.decode(token, PRIVATE_KEY, algorithms=["HS256"])
            request.user = data
        except:
            return jsonify({"error": "Invalid token"}), 401

        return f(*args, **kwargs)

    return wrapper

def verify_password(hash: str, password: str) -> bool:
    try:
        return ph.verify(hash, password)
    except:
        return False
    
def verify_otp(user, code):
    if not user.get("otp_enabled"):
        return True

    totp = pyotp.TOTP(user["otp_secret"])
    return totp.verify(code)