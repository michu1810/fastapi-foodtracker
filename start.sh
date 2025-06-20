#!/bin/bash
set -e

python - <<'PY'
import os, reprlib, psycopg2, textwrap

dsn = os.getenv("DATABASE_URL")
print("▶ DEBUG DSN =", reprlib.repr(dsn))

try:
    psycopg2.connect(dsn, connect_timeout=5)
except Exception as e:
    print("❌ TEST CONNECT:", e, "\n" + "-"*60)
else:
    print("✅ TEST CONNECT: OK — user i hasło pasują!\n" + "-"*60)
PY

echo "▶️ Uruchamianie migracji bazy danych..."
alembic -c foodtracker_app/alembic.ini upgrade head

echo "▶️ Startowanie serwera Uvicorn..."
exec "$@"
