from celery import Celery
from celery.schedules import crontab
import os
import time
import redis
from foodtracker_app.settings import settings

celery_app = Celery(
    "foodtracker",
    broker=os.getenv("CELERY_BROKER_URL", "redis://redis:6379/0"),
    backend=os.getenv("CELERY_BACKEND_URL", "redis://redis:6379/1"),
    include=["foodtracker_app.notifications.tasks"]
)

celery_app.conf.timezone = "UTC"
celery_app.conf.enable_utc = True

celery_app.conf.beat_schedule = {
    "run-expiration-check-daily": {
        "task": "foodtracker_app.notifications.tasks.notify_expiring_products",
        "schedule": crontab(hour=8, minute=0),
    },
}

celery_app.autodiscover_tasks(["foodtracker_app.notifications"])


def wait_for_redis(host="redis", port=6379, retries=10, delay=2):
    if settings.SKIP_REDIS:
        print("⏩ SKIPPING Redis check")
        return
    r = redis.StrictRedis(host=host, port=port)
    for _ in range(retries):
        try:
            r.ping()
            print("✅ Redis connected")
            return
        except redis.exceptions.ConnectionError:
            print("⏳ Waiting for Redis...")
            time.sleep(delay)
    raise RuntimeError("❌ Redis not available after retries")

if not settings.TESTING:
    wait_for_redis()
