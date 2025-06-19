import psycopg2
from sqlalchemy.engine.url import make_url

# Próba importu obiektu settings, tak jak robi to Alembic
try:
    from foodtracker_app.settings import settings

    SETTINGS_IMPORTED = True
except ImportError as e:
    print(
        f"❌ KRYTYCZNY BŁĄD: Nie można zaimportować 'settings' z 'foodtracker_app.settings'. Błąd: {e}"
    )
    SETTINGS_IMPORTED = False

print("\n--- ROZPOCZYNAM OSTATECZNY TEST POŁĄCZENIA ---")
print("Testuję DOKŁADNIE tę samą zmienną, której używa Alembic: settings.DATABASE_URL")

if SETTINGS_IMPORTED:
    try:
        # Pobieramy URL z obiektu settings
        raw_url = settings.DATABASE_URL

        # Konwertujemy na URL synchroniczny, identycznie jak w env.py
        sync_url = str(make_url(raw_url).set(drivername="postgresql"))

        # Cenzurujemy hasło do logów
        password_to_censor = ""
        # Próba odnalezienia hasła w różnych możliwych miejscach
        if hasattr(settings, "DB_PASSWORD") and settings.DB_PASSWORD:
            password_to_censor = settings.DB_PASSWORD
        elif (
            hasattr(settings, "DATABASE_URL")
            and hasattr(settings.DATABASE_URL, "password")
            and settings.DATABASE_URL.password
        ):
            password_to_censor = settings.DATABASE_URL.password

        if password_to_censor:
            log_url = sync_url.replace(password_to_censor, "***")
        else:
            log_url = "URL (nie udało się ocenzurować hasła)"

        print(f"Próbuję połączyć się używając URL z obiektu settings: {log_url}")

        conn = psycopg2.connect(sync_url)
        print("✅✅✅ SUKCES! Połączenie z użyciem `settings.DATABASE_URL` DZIAŁA.")
        conn.close()
    except Exception as e:
        print("❌❌❌ BŁĄD! Połączenie z użyciem `settings.DATABASE_URL` NIE DZIAŁA.")
        print(f"   Szczegóły błędu: {e}")
else:
    print("Test pominięty z powodu błędu importu 'settings'.")

print("--- ZAKOŃCZONO OSTATECZNY TEST POŁĄCZENIA ---\n")
