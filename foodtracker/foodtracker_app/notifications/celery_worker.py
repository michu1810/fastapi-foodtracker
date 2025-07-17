import os
import time
import redis
from urllib.parse import urlparse
from celery import Celery
from celery.schedules import crontab
from foodtracker_app.settings import settings
from foodtracker_app.models.financial_stats import FinancialStat  # noqa
from foodtracker_app.models.product import Product  # noqa
from foodtracker_app.models.user import User  # noqa

BROKER = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
BACKEND = os.getenv("CELERY_BACKEND_URL", "redis://localhost:6379/1")

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
            "task": "notifications.notify_expiring_products",
            "schedule": crontab(hour=8, minute=0),  # 08:00 UTC = 10:00 w Polsce
        }
    },
    broker_connection_retry_on_startup=True,
)


def wait_for_redis(url: str, retries=5, delay=2):
    if settings.SKIP_REDIS:
        print("⏩ SKIPPING Redis check")
        return
    u = urlparse(url)
    r = redis.StrictRedis(
        host=u.hostname,
        port=u.port or 6379,
        ssl=u.scheme == "rediss",
        password=u.password,
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
