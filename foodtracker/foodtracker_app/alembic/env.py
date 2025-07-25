from logging.config import fileConfig

from alembic import context
from foodtracker_app.db.database import Base
from foodtracker_app.settings import settings
from sqlalchemy import engine_from_config, pool
from sqlalchemy.engine.url import make_url

from foodtracker_app.models.user import User  # noqa: F401
from foodtracker_app.models.product import Product  # noqa: F401
from foodtracker_app.models.pantry import Pantry  # noqa: F401
from foodtracker_app.models.pantry_user import PantryUser  # noqa: F401
from foodtracker_app.models.category import Category  # noqa: F401
from foodtracker_app.models.financial_stats import FinancialStat  # noqa: F401

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

raw_url = settings.DATABASE_URL

url = make_url(raw_url).set(drivername="postgresql")

if settings.IS_PRODUCTION:
    url = url.update_query_pairs([("sslmode", "require")])

print("▶ DEBUG ALEMBIC - DATABASE_URL (z settings):", raw_url)
print("▶ DEBUG ALEMBIC - FINAL SYNC_URL FOR ALEMBIC:", str(url))

config.set_main_option("sqlalchemy.url", url.render_as_string(hide_password=False))


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
