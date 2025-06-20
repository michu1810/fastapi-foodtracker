#!/bin/bash
set -e

echo "▶️ Uruchamianie migracji bazy danych..."


alembic -c /app/foodtracker_app/alembic.ini upgrade head

echo "▶️ Startowanie serwera Uvicorn..."

exec "$@"
