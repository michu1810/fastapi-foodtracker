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
sync_url = str(make_url(raw_url).set(drivername="postgresql"))

print("▶ DEBUG ALEMBIC - DATABASE_URL (z settings):", raw_url)
print("▶ DEBUG ALEMBIC - SYNC_URL:", sync_url)

config.set_main_option("sqlalchemy.url", sync_url)


def run_migrations_offline() -> None:
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
