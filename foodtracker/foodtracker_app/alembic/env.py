from logging.config import fileConfig
import os
import sys
import psycopg2
from alembic import context
from foodtracker_app.db.database import Base
from sqlalchemy import engine_from_config, pool
from sqlalchemy.engine.url import make_url

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)
target_metadata = Base.metadata


def test_neon_auth():
    """Test różnych metod uwierzytelniania z Neon"""
    raw_url = os.getenv("DATABASE_URL")
    if not raw_url:
        print("❌ BŁĄD: DATABASE_URL nie jest ustawione")
        return None

    print("🔍 TESTOWANIE RÓŻNYCH METOD UWIERZYTELNIANIA NEON")
    print("=" * 60)

    # Test 1: Oryginalny URL
    print("Test 1: Oryginalny URL")
    try:
        parsed = make_url(raw_url)
        sync_url = str(parsed.set(drivername="postgresql"))
        print(f"   URL: {sync_url}")
        conn = psycopg2.connect(sync_url)
        print("   ✅ SUKCES!")
        conn.close()
        return sync_url
    except Exception as e:
        print(f"   ❌ FAILED: {e}")

    # Test 2: Z explicitnym portem 5432
    print("\nTest 2: Z explicitnym portem 5432")
    try:
        parsed = make_url(raw_url)
        sync_url = str(parsed.set(drivername="postgresql", port=5432))
        print(f"   URL: {sync_url}")
        conn = psycopg2.connect(sync_url)
        print("   ✅ SUKCES!")
        conn.close()
        return sync_url
    except Exception as e:
        print(f"   ❌ FAILED: {e}")

    # Test 3: Bez sslmode w URL (może być duplikowany w connect_args)
    print("\nTest 3: Bez sslmode w URL")
    try:
        parsed = make_url(raw_url)
        # Usuń sslmode z query string
        new_query = {k: v for k, v in parsed.query.items() if k != "sslmode"}
        sync_url = str(parsed.set(drivername="postgresql", query=new_query))
        print(f"   URL: {sync_url}")
        conn = psycopg2.connect(sync_url, sslmode="require")
        print("   ✅ SUKCES!")
        conn.close()
        return sync_url
    except Exception as e:
        print(f"   ❌ FAILED: {e}")

    # Test 4: Z connection pooler (-pooler w hostname)
    print("\nTest 4: Z Neon connection pooler")
    try:
        parsed = make_url(raw_url)
        pooler_host = parsed.host.replace(".aws.neon.tech", "-pooler.aws.neon.tech")
        sync_url = str(parsed.set(drivername="postgresql", host=pooler_host, port=5432))
        print(f"   URL: {sync_url}")
        conn = psycopg2.connect(sync_url)
        print("   ✅ SUKCES!")
        conn.close()
        return sync_url
    except Exception as e:
        print(f"   ❌ FAILED: {e}")

    # Test 5: Sprawdź czy hasło nie ma ukrytych znaków
    print("\nTest 5: Debug hasła")
    try:
        parsed = make_url(raw_url)
        password = parsed.password
        print(f"   Długość hasła: {len(password) if password else 'None'}")
        print(
            f"   Zawiera specjalne znaki: {any(c in password for c in '!@#$%^&*()[]{}|;:,.<>?' if password)}"
        )
        print("   Hasło (hex): " + password.encode().hex() if password else "None")

        # Spróbuj z URL-encoded hasłem
        from urllib.parse import quote_plus

        if password:
            encoded_password = quote_plus(password)
            if encoded_password != password:
                print("   Próba z URL-encoded hasłem...")
                new_url = raw_url.replace(password, encoded_password)
                sync_url = str(make_url(new_url).set(drivername="postgresql"))
                conn = psycopg2.connect(sync_url)
                print("   ✅ SUKCES z URL-encoded hasłem!")
                conn.close()
                return sync_url
    except Exception as e:
        print(f"   ❌ FAILED: {e}")

    return None


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""

    # Pobierz i sprawdź DATABASE_URL
    raw_url = os.getenv("DATABASE_URL")
    if not raw_url:
        raise ValueError(
            "BŁĄD KRYTYCZNY: Zmienna środowiskowa DATABASE_URL nie jest ustawiona!"
        )

    print("=" * 80)
    print("🚀 NEON DATABASE CONNECTION DIAGNOSTICS")
    print("=" * 80)
    print(f"📊 Python version: {sys.version}")
    print(f"📊 Working directory: {os.getcwd()}")
    print(f"📊 Process ID: {os.getpid()}")

    # Test różnych metod uwierzytelniania
    working_url = test_neon_auth()

    if not working_url:
        print("\n💥 WSZYSTKIE TESTY UWIERZYTELNIANIA FAILED!")
        print("🔧 MOŻLIWE PRZYCZYNY:")
        print("   1. Hasło wygasło lub zostało zmienione")
        print("   2. Neon database jest zatrzymany (hibernation)")
        print("   3. Limit połączeń został przekroczony")
        print("   4. Problem z siecią/DNS")
        print("   5. Konto Neon zostało zawieszone")

        # Próba z oryginalnym URL mimo wszystko
        parsed_url = make_url(raw_url)
        working_url = str(parsed_url.set(drivername="postgresql"))
        print(f"\n⚠️  Kontynuacja z oryginalnym URL: {working_url}")
    else:
        print(f"\n🎉 ZNALEZIONO DZIAŁAJĄCY URL: {working_url}")

    # Ustawienie URL dla Alembic
    config.set_main_option("sqlalchemy.url", working_url)

    # Prosta konfiguracja bez problematycznych opcji pool
    try:
        connectable = engine_from_config(
            config.get_section(config.config_ini_section, {}),
            prefix="sqlalchemy.",
            poolclass=pool.NullPool,
        )

        with connectable.connect() as connection:
            context.configure(connection=connection, target_metadata=target_metadata)

            with context.begin_transaction():
                context.run_migrations()

        print("🎉 MIGRACJE ZAKOŃCZONE POMYŚLNIE!")

    except Exception as e:
        print(f"💥 BŁĄD PODCZAS MIGRACJI: {e}")
        print(f"   Typ błędu: {type(e).__name__}")
        if hasattr(e, "orig"):
            print(f"   Oryginalny błęd: {e.orig}")
        raise


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
