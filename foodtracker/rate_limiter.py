from fastapi import Request
from foodtracker_app.settings import settings
from slowapi import Limiter
from slowapi.util import get_remote_address

redis_url = "memory://"
if not settings.SKIP_REDIS:
    redis_url = settings.REDIS_URL

limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=redis_url,
)


def get_user_key(request: Request) -> str:
    """Per-user rate limiting key — używa emaila z JWT, fallback na IP."""
    try:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            from jose import jwt as jose_jwt

            token = auth[7:]
            payload = jose_jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=[settings.jwt_algorithm],
                audience="foodtracker-user",
                issuer="foodtracker-api",
            )
            email = payload.get("sub")
            if email:
                return f"user:{email}"
    except Exception:
        pass
    return get_remote_address(request)
