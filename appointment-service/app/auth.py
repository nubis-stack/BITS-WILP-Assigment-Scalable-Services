from functools import wraps

import jwt
from flask import current_app, g, jsonify, request


def _claims_from_header():
    header = request.headers.get("Authorization", "")
    parts = header.split(" ")
    if len(parts) != 2 or parts[0] != "Bearer":
        return None, "login required"
    try:
        claims = jwt.decode(parts[1], current_app.config["JWT_SECRET"], algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        return None, "session expired, please login again"
    except jwt.InvalidTokenError:
        return None, "invalid token, please login again"
    return claims, None


def login_required(*roles):
    """Checks the token issued by auth-service. Optionally restrict to roles."""
    def wrap(fn):
        @wraps(fn)
        def inner(*args, **kwargs):
            claims, err = _claims_from_header()
            if err:
                return jsonify({"message": err}), 401
            if roles and claims.get("role") not in roles:
                return jsonify({"message": "you are not allowed to do this"}), 403
            g.user = claims
            return fn(*args, **kwargs)
        return inner
    return wrap


def is_admin():
    return g.user.get("role") == "admin"
