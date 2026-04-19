from flask import request, jsonify
from functools import wraps


def require_roles(*roles):
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            user = getattr(request, "user", None)

            if not user:
                return jsonify({"error": "Unauthorized"}), 401
            
            if user.get("role") not in roles:
                return jsonify({"error": "Forbidden"}), 403
        
            return f(*args, **kwargs)
        return wrapper
    return decorator