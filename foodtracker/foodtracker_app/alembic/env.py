from logging.config import fileConfig
import os
import sys
import time
import psycopg2
from alembic import context
from foodtracker_app.db.database import Base
from sqlalchemy import engine_from_config, pool, create_engine
from sqlalchemy.engine.url import make_url

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)
target_metadata = Base.metadata


def test_direct_connection():
    """Test bezpośredniego połączenia psycopg2"""
    raw_url = os.getenv("DATABASE_URL")
    if not raw_url:
        print("❌ BŁĄD: DATABASE_URL nie jest ustawione")
        return False

    try:
        # Konwersja URL na komponenty
        parsed = make_url(raw_url)
        sync_url = str(parsed.set(drivername="postgresql"))

        print("🔍 Testowanie bezpośredniego połączenia psycopg2...")
        print(f"   URL: {sync_url}")

        # Test bezpośredniego połączenia
        conn = psycopg2.connect(sync_url)
        cursor = conn.cursor()
        cursor.execute("SELECT version();")
        version = cursor.fetchone()
        print(f"✅ Bezpośrednie połączenie OK: {version[0][:50]}...")
        cursor.close()
        conn.close()
        return True
    except Exception as e:
        print(f"❌ Bezpośrednie połączenie FAILED: {e}")
        return False


def test_sqlalchemy_connection(url):
    """Test połączenia przez SQLAlchemy"""
    try:
        print("🔍 Testowanie połączenia SQLAlchemy...")
        print(f"   URL: {url}")

        # Test z różnymi konfiguracjami
        configs_to_test = [
            {},  # Domyślna konfiguracja
            {"pool_pre_ping": True, "pool_recycle": 300},
            {"pool_size": 1, "max_overflow": 0},
            {"connect_args": {"sslmode": "require"}},
        ]

        for i, extra_config in enumerate(configs_to_test):
            try:
                print(f"   Test {i + 1}: {extra_config}")
                engine = create_engine(url, poolclass=pool.NullPool, **extra_config)
                with engine.connect() as conn:
                    result = conn.execute("SELECT 1").fetchone()  # noqa
                    print(f"   ✅ Test {i + 1} OK")
                    return True
            except Exception as e:
                print(f"   ❌ Test {i + 1} FAILED: {e}")
                continue

        return False
    except Exception as e:
        print(f"❌ SQLAlchemy test FAILED: {e}")
        return False


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
    print("🚀 ROZSZERZONA DIAGNOSTYKA POŁĄCZENIA")
    print("=" * 80)
    print(f"📊 Python version: {sys.version}")
    print(f"📊 Working directory: {os.getcwd()}")
    print(f"📊 Process ID: {os.getpid()}")
    print(f"📊 User: {os.getenv('USER', 'unknown')}")

    # Test environment variables
    print("\n🔍 ZMIENNE ŚRODOWISKOWE:")
    for key in ["DATABASE_URL", "USER", "HOME", "PATH"]:
        value = os.getenv(key, "NOT SET")
        if key == "DATABASE_URL" and value != "NOT SET":
            # Zamaskuj hasło
            masked = value.replace(value.split(":")[2].split("@")[0], "***")
            print(f"   {key}: {masked}")
        else:
            print(f"   {key}: {value}")

    # Konwersja URL
    try:
        parsed_url = make_url(raw_url)
        sync_url = str(parsed_url.set(drivername="postgresql"))
        print("\n📍 URL CONVERSION:")
        print(f"   Raw URL: {raw_url}")
        print(f"   Sync URL: {sync_url}")
        print(f"   Host: {parsed_url.host}")
        print(f"   Port: {parsed_url.port}")
        print(f"   Database: {parsed_url.database}")
        print(f"   Username: {parsed_url.username}")
    except Exception as e:
        print(f"❌ URL parsing error: {e}")
        raise

    # Test bezpośredniego połączenia
    print("\n" + "=" * 50)
    direct_success = test_direct_connection()

    # Krótka pauza
    print("\n⏳ Waiting 2 seconds...")
    time.sleep(2)

    # Test SQLAlchemy
    print("\n" + "=" * 50)
    sqlalchemy_success = test_sqlalchemy_connection(sync_url)

    print("\n" + "=" * 80)
    print("📊 PODSUMOWANIE TESTÓW:")
    print(f"   Bezpośrednie psycopg2: {'✅ OK' if direct_success else '❌ FAILED'}")
    print(f"   SQLAlchemy: {'✅ OK' if sqlalchemy_success else '❌ FAILED'}")
    print("=" * 80)

    if not sqlalchemy_success:
        print("⚠️  SQLAlchemy test failed - kontynuacja z standardową konfiguracją...")

    # Ustawienie URL dla Alembic
    config.set_main_option("sqlalchemy.url", sync_url)

    # Konfiguracja z dodatkowymi opcjami
    configuration = config.get_section(config.config_ini_section, {})
    configuration.update(
        {
            "sqlalchemy.pool_pre_ping": "true",
            "sqlalchemy.pool_recycle": "300",
            "sqlalchemy.pool_size": "1",
            "sqlalchemy.max_overflow": "0",
        }
    )

    try:
        connectable = engine_from_config(
            configuration,
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
            print(f"   Oryginalny błąd: {e.orig}")
        raise


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
