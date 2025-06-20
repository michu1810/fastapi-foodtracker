#!/bin/bash
set -e

echo "▶️ Uruchamianie migracji bazy danych..."
echo "DEBUG: DATABASE_URL is $DATABASE_URL" && alembic upgrade head
alembic -c foodtracker_app/alembic.ini upgrade head

echo "▶️ Startowanie serwera Uvicorn..."
exec "$@"
