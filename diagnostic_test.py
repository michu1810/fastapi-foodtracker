"""
Test diagnostyczny do identyfikacji różnic między test_db.py a Alembic
"""

import os
import sys
import psycopg2
from sqlalchemy import create_engine
from urllib.parse import urlparse


def print_env_info():
    print(f"Python version: {sys.version}")
    print(f"psycopg2 version: {psycopg2.__version__}")
    print(f"Current working directory: {os.getcwd()}")
    print(f"PYTHONPATH: {sys.path}")
    print(f"Process ID: {os.getpid()}")
    print(f"User ID: {os.getuid() if hasattr(os, 'getuid') else 'N/A'}")


def test_direct_psycopg2(database_url):
    """Test bezpośredniego połączenia psycopg2"""
    print("\n=== TEST 1: Direct psycopg2 ===")
    try:
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor()
        cursor.execute("SELECT version();")
        result = cursor.fetchone()
        print(f"✅ SUCCESS: {result[0][:50]}...")
        cursor.close()
        conn.close()
        return True
    except Exception as e:
        print(f"❌ FAILED: {e}")
        return False


def test_sqlalchemy_engine(database_url):
    """Test SQLAlchemy engine"""
    print("\n=== TEST 2: SQLAlchemy engine ===")
    try:
        engine = create_engine(database_url)
        with engine.connect() as conn:
            result = conn.execute("SELECT version();")
            row = result.fetchone()
            print(f"✅ SUCCESS: {row[0][:50]}...")
        return True
    except Exception as e:
        print(f"❌ FAILED: {e}")
        return False


def test_alembic_style_connection(database_url):
    """Test połączenia w stylu Alembic"""
    print("\n=== TEST 3: Alembic-style connection ===")
    try:
        from sqlalchemy import engine_from_config

        # Symulujemy konfigurację Alembic
        config = {
            "sqlalchemy.url": database_url,
            "sqlalchemy.echo": False,
            "sqlalchemy.pool_pre_ping": True,
            "sqlalchemy.pool_recycle": 300,
        }

        engine = engine_from_config(config, prefix="sqlalchemy.", poolclass=None)

        with engine.connect() as conn:
            result = conn.execute("SELECT version();")
            row = result.fetchone()
            print(f"✅ SUCCESS: {row[0][:50]}...")
        return True
    except Exception as e:
        print(f"❌ FAILED: {e}")
        return False


def test_url_variations(base_url):
    """Test różnych wariantów URL"""
    print("\n=== TEST 4: URL variations ===")

    parsed = urlparse(base_url)

    variations = [
        # Oryginalny URL
        base_url,
        # Z explicitnym endpoint w password
        f"postgresql://{parsed.username}:endpoint={parsed.hostname.split('.')[0]};{parsed.password}@{parsed.hostname}/neondb?sslmode=require",
        # Z endpoint w options
        f"{base_url}&options=endpoint%3D{parsed.hostname.split('.')[0]}",
        # Bez sslmode
        base_url.replace("?sslmode=require", ""),
        # Z verify-full
        base_url.replace("sslmode=require", "sslmode=verify-full"),
    ]

    for i, url in enumerate(variations, 1):
        print(f"\nVariation {i}: {url[:80]}...")
        try:
            conn = psycopg2.connect(url)
            conn.close()
            print("✅ SUCCESS")
        except Exception as e:
            print(f"❌ FAILED: {str(e)[:100]}...")


def main():
    print("🔍 DIAGNOSTIC TEST FOR NEON CONNECTION PARADOX")
    print("=" * 60)

    print_env_info()

    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("❌ DATABASE_URL not found in environment")
        return

    print(f"\nDatabase URL: {database_url[:50]}...{database_url[-20:]}")

    # Uruchom wszystkie testy
    test_direct_psycopg2(database_url)
    test_sqlalchemy_engine(database_url)
    test_alembic_style_connection(database_url)
    test_url_variations(database_url)

    print("\n" + "=" * 60)
    print("🔍 DIAGNOSTIC COMPLETE")


if __name__ == "__main__":
    main()
