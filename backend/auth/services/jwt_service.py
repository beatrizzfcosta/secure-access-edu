import os
import uuid
import jwt
from datetime import timedelta

ACCESS_EXP = os.getenv('JWT_ACCESS_EXP', '15m')
REFRESH_EXP = os.getenv('JWT_REFRESH_EXP', '7d')
ACCESS_SECRET = os.getenv('JWT_ACCESS_SECRET', os.getenv('JWT_SECRET_KEY', 'dev-access-secret'))
REFRESH_SECRET = os.getenv('JWT_REFRESH_SECRET', os.getenv('JWT_SECRET_KEY', 'dev-refresh-secret'))

def _new_jti() -> str:
    return str(uuid.uuid4())

def sign_access_token(payload: dict) -> str:
    return jwt.encode(payload, ACCESS_SECRET, algorithm='HS256', headers={'typ': 'JWT'})

def sign_refresh_token(payload: dict) -> dict:
    jti = _new_jti()
    data = {**payload, 'jti': jti}
    token = jwt.encode(data, REFRESH_SECRET, algorithm='HS256')
    return {'token': token, 'jti': jti}

def verify_access_token(token: str) -> dict:
    return jwt.decode(token, ACCESS_SECRET, algorithms=['HS256'])

def verify_refresh_token(token: str) -> dict:
    return jwt.decode(token, REFRESH_SECRET, algorithms=['HS256'])
