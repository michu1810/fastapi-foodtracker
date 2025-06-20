#!/bin/bash
set -e

echo "================================================="
echo "   ROZPOCZYNAM MISJĘ DIAGNOSTYCZNĄ NEON/RENDER   "
echo "================================================="

echo -e "\n--- URUCHAMIAM diagnostic_test.py ---\n"
python3 diagnostic_test.py

echo -e "\n\n--- URUCHAMIAM neon_workaround_test.py ---\n"
python3 neon_workaround_test.py

echo -e "\n\n================================================="
echo "     MISJA DIAGNOSTYCZNA ZAKOŃCZONA          "
echo "  Sprawdź powyższe logi w poszukiwaniu ✅ SUCCESS   "
echo "================================================="

# Na razie zatrzymujemy dalsze wykonywanie, żeby nie zaśmiecać logów błędem Alembic
exit 0
