#!/bin/bash

set +e

echo "--- ROZPOCZYNAM ROZSZERZONĄ DIAGNOSTYKĘ W start.sh ---"

echo ""
echo "--- ETAP 1: Środowisko ---"
echo "Sprawdzam zmienne środowiskowe (filtruję po 'DATABASE'):"
env | sort | grep DATABASE || echo "Nie znaleziono zmiennej DATABASE"

echo ""
echo "--- ETAP 2: Pakiety ---"
echo "Sprawdzam wersję Pythona:"
python3 --version
echo "Sprawdzam zainstalowane pakiety (filtruję po 'psycopg' i 'sqlalchemy'):"
pip freeze | grep -E 'psycopg|sqlalchemy'

echo ""
echo "--- ETAP 3: Test połączenia ---"
echo "Uruchamiam zewnętrzny skrypt testujący połączenie (test_db.py):"
python3 test_db.py

echo ""
echo "--- KONIEC DIAGNOSTYKI, PRÓBA URUCHOMIENIA ALEMBIC ---"

alembic -c foodtracker_app/alembic.ini upgrade head

ALEMBIC_EXIT_CODE=$?
if [ $ALEMBIC_EXIT_CODE -ne 0 ]; then
    echo "BŁĄD KRYTYCZNY: Alembic zakończył działanie z kodem błędu $ALEMBIC_EXIT_CODE."
fi

echo "--- Uruchamianie aplikacji Uvicorn ---"
exec "$@"
