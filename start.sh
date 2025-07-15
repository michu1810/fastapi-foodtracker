#!/bin/bash
set -e

echo "▶️ Alembic upgrade…"
alembic -c foodtracker_app/alembic.ini upgrade head

echo "▶️ Redis start…"
/usr/bin/redis-server --port 6379 --bind 0.0.0.0 --protected-mode no &
REDIS_PID=$!

touch /app/celerybeat-schedule
chmod 666 /app/celerybeat-schedule

echo "▶️ Uvicorn start…"
uvicorn foodtracker_app.main:app --host 0.0.0.0 --port 8000 &
UVICORN_PID=$!

echo "▶️ Celery beat start…"
celery -A foodtracker_app.notifications.celery_worker \
  beat --loglevel=info \
  --scheduler django_celery_beat.schedulers.DatabaseScheduler \
  --schedule=/app/celerybeat-schedule &

echo "▶️ Celery worker start…"
celery -A foodtracker_app.notifications.celery_worker \
  worker --loglevel=info --concurrency=2

wait $UVICORN_PID
