import os
import time
import redis
from celery import Celery
from celery.schedules import crontab
from foodtracker_app.settings import settings

BROKER = os.getenv("CELERY_BROKER_URL", settings.REDIS_URL)
BACKEND = os.getenv("CELERY_BACKEND_URL", settings.REDIS_URL)

celery_app = Celery(
    "foodtracker",
    broker=BROKER,
    backend=BACKEND,
    include=["foodtracker_app.notifications.tasks"],
)

celery_app.conf.update(
    timezone="UTC",
    enable_utc=True,
    beat_schedule={
        "run-expiration-check-daily": {
            "task": "foodtracker_app.notifications.tasks.notify_expiring_products",
            "schedule": crontab(hour=8, minute=0),
        },
    },
    broker_connection_retry_on_startup=True,
)


def wait_for_redis(url: str, retries=5, delay=2):
    if settings.SKIP_REDIS:
        print("⏩ SKIPPING Redis check")
        return
    from urllib.parse import urlparse

    u = urlparse(url)
    r = redis.StrictRedis(
        host=u.hostname, port=u.port or 6379, ssl=u.scheme == "rediss"
    )
    for _ in range(retries):
        try:
            r.ping()
            print("✅ Redis connected")
            return
        except redis.exceptions.ConnectionError:
            print("⏳ Waiting for Redis…")
            time.sleep(delay)
    raise RuntimeError("❌ Redis not available")


if not settings.TESTING:
    wait_for_redis(BROKER)
