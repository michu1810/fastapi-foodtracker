#!/bin/bash
set -e

python - <<'PY'
import os, psycopg2, urllib.parse, pprint
raw = os.environ["DATABASE_URL"]

SYNC = raw.replace("postgresql+asyncpg://", "postgresql://", 1)
SYNC = SYNC.replace("postgresql+psycopg2://", "postgresql://", 1)

print("▶ TEST DSN  =", SYNC)
try:
    psycopg2.connect(SYNC, connect_timeout=5)
except Exception as e:
    print("❌ TEST CONNECT:", e, "\n" + "-"*60)
else:
    print("✅ TEST CONNECT: OK\n" + "-"*60)
PY
echo "▶️ Uruchamianie migracji bazy danych..."
alembic -c foodtracker_app/alembic.ini upgrade head

echo "▶️ Startowanie serwera Uvicorn..."
exec "$@"
