from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from foodtracker_app.settings import settings

redis_url = "memory://"
if not settings.SKIP_REDIS:
    redis_url = settings.REDIS_URL

limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=redis_url,
)