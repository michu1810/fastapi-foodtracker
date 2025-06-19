#!/bin/bash
set -e # Przywracamy przerywanie skryptu w razie błędu

# Uruchom migracje bazy danych
echo "▶️ Uruchamianie migracji bazy danych..."
alembic -c foodtracker_app/alembic.ini upgrade head

# Uruchom aplikację Uvicorn
echo "▶️ Startowanie serwera Uvicorn..."
exec "$@"
