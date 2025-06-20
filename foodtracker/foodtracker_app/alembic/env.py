from logging.config import fileConfig

from alembic import context
from foodtracker_app.db.database import Base
from foodtracker_app.settings import settings
from sqlalchemy import engine_from_config, pool
from sqlalchemy.engine.url import make_url

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

raw_url = settings.DATABASE_URL

url = make_url(raw_url)

url = url.set(drivername="postgresql")

url = url.update_query_pairs({"sslmode": "require"})

sync_url = str(url)

print("▶ DEBUG ALEMBIC - DATABASE_URL (z settings):", raw_url)
print("▶ DEBUG ALEMBIC - MODIFIED SYNC_URL:", sync_url)

config.set_main_option("sqlalchemy.url", sync_url)


def run_migrations_offline() -> None:
    """Uruchom migracje w trybie 'offline'.

    To konfiguruje kontekst tylko z URL-em,
    bez Engine. Skrypty są generowane do standardowego wyjścia.
    """
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
    """Uruchom migracje w trybie 'online'.

    W tym trybie tworzymy Engine i łączymy się z bazą danych,
    a następnie przekazujemy to połączenie do kontekstu.
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
