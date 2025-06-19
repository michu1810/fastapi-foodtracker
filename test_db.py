import psycopg2
import os


DATABASE_URL = "postgresql://neondb_owner:npg_SLDK2f8cMuQd@ep-old-brook-a25sd2p4.eu-central-1.aws.neon.tech/neondb?sslmode=require"

print("--- ROZPOCZYNAM TEST POŁĄCZENIA Z test_db.py ---")
try:
    print(
        f"Próbuję połączyć się używając URL: {DATABASE_URL.replace(os.getenv('NEON_PASSWORD', 'HASLO'), '***')}"
    )
    conn = psycopg2.connect(DATABASE_URL)
    print("✅ SUKCES! test_db.py pomyślnie połączył się z bazą danych.")
    conn.close()
except Exception as e:
    print("❌ BŁĄD w test_db.py! Nie udało się połączyć.")
    print(f"   Szczegóły błędu: {e}")
print("--- ZAKOŃCZONO TEST POŁĄCZENIA Z test_db.py ---")
