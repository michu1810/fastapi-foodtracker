#!/usr/bin/env python3
"""
Test workaround'ów dla problemu SNI z Neon
Oparty na oficjalnej dokumentacji Neon
"""

import os
import psycopg2
from urllib.parse import urlparse


def extract_endpoint_id(hostname):
    """Wyciąga endpoint ID z hostname Neon"""
    return hostname.split(".")[0]


def test_endpoint_in_password_workaround(original_url):
    """Test workaround z endpoint ID w polu password"""
    print("\n=== WORKAROUND 1: Endpoint in password field ===")

    parsed = urlparse(original_url)
    endpoint_id = extract_endpoint_id(parsed.hostname)

    # Wariant z semicolon
    new_password_semi = f"endpoint={endpoint_id};{parsed.password}"
    new_url_semi = original_url.replace(
        f":{parsed.password}@", f":{new_password_semi}@"
    )

    print(f"Testing semicolon variant: endpoint={endpoint_id};***")
    try:
        conn = psycopg2.connect(new_url_semi)
        conn.close()
        print("✅ SUCCESS with semicolon separator")
        return new_url_semi
    except Exception as e:
        print(f"❌ FAILED with semicolon: {e}")

    # Wariant z dollar sign
    new_password_dollar = f"endpoint={endpoint_id}${parsed.password}"
    new_url_dollar = original_url.replace(
        f":{parsed.password}@", f":{new_password_dollar}@"
    )

    print(f"Testing dollar variant: endpoint={endpoint_id}$***")
    try:
        conn = psycopg2.connect(new_url_dollar)
        conn.close()
        print("✅ SUCCESS with dollar separator")
        return new_url_dollar
    except Exception as e:
        print(f"❌ FAILED with dollar: {e}")

    return None


def test_endpoint_in_options_workaround(original_url):
    """Test workaround z endpoint ID w options"""
    print("\n=== WORKAROUND 2: Endpoint in options ===")

    parsed = urlparse(original_url)
    endpoint_id = extract_endpoint_id(parsed.hostname)

    # Dodaj endpoint do options
    if "?" in original_url:
        new_url = f"{original_url}&options=endpoint%3D{endpoint_id}"
    else:
        new_url = f"{original_url}?options=endpoint%3D{endpoint_id}"

    print(f"Testing options variant: options=endpoint%3D{endpoint_id}")
    try:
        conn = psycopg2.connect(new_url)
        conn.close()
        print("✅ SUCCESS with options")
        return new_url
    except Exception as e:
        print(f"❌ FAILED with options: {e}")

    return None


def test_sslmode_verify_full(original_url):
    """Test workaround z sslmode=verify-full"""
    print("\n=== WORKAROUND 3: sslmode=verify-full ===")

    new_url = original_url.replace("sslmode=require", "sslmode=verify-full")

    print("Testing verify-full variant")
    try:
        conn = psycopg2.connect(new_url)
        conn.close()
        print("✅ SUCCESS with verify-full")
        return new_url
    except Exception as e:
        print(f"❌ FAILED with verify-full: {e}")

    return None


def create_fixed_alembic_env(working_url):
    """Generuje poprawiony env.py dla Alembic"""
    print("\n=== GENERATING FIXED ALEMBIC ENV ===")

    env_py_content = f'''"""
Poprawiony env.py dla Alembic z workaround dla Neon SNI
"""
from logging.config import fileConfig
import os
from alembic import context
from sqlalchemy import engine_from_config, pool
from foodtracker_app.db.database import Base

# this is the Alembic Config object
config = context.config

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

def get_url():
    """Pobiera URL z workaround dla Neon"""
    # URL z working workaround
    return "{working_url}"

def run_migrations_offline():
    """Run migrations in 'offline' mode."""
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={{"paramstyle": "named"}},
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online():
    """Run migrations in 'online' mode."""
    configuration = config.get_section(config.config_ini_section)
    configuration["sqlalchemy.url"] = get_url()

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
'''

    print("Generated fixed env.py content")
    return env_py_content


def main():
    print("🔧 NEON SNI WORKAROUND TESTS")
    print("=" * 50)

    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("❌ DATABASE_URL not found in environment")
        return

    print(f"Original URL: {database_url[:50]}...{database_url[-20:]}")

    # Test wszystkich workaround'ów
    working_solutions = []

    solution1 = test_endpoint_in_password_workaround(database_url)
    if solution1:
        working_solutions.append(("Endpoint in password", solution1))

    solution2 = test_endpoint_in_options_workaround(database_url)
    if solution2:
        working_solutions.append(("Endpoint in options", solution2))

    solution3 = test_sslmode_verify_full(database_url)
    if solution3:
        working_solutions.append(("SSL verify-full", solution3))

    # Podsumowanie
    print("\n" + "=" * 50)
    print("🎯 WORKING SOLUTIONS:")

    if working_solutions:
        for name, url in working_solutions:
            print(f"✅ {name}")

        # Użyj pierwszego działającego rozwiązania
        best_solution = working_solutions[0]
        print(f"\n🚀 RECOMMENDED SOLUTION: {best_solution[0]}")
        print(f"URL: {best_solution[1]}")

        # Wygeneruj poprawiony env.py
        fixed_env = create_fixed_alembic_env(best_solution[1])
        print("\n📝 Save this as alembic/env.py:")
        print("-" * 30)
        print(fixed_env)

    else:
        print("❌ No working solutions found")
        print("🔍 This confirms the platform-level issue theory")


if __name__ == "__main__":
    main()
