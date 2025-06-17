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
