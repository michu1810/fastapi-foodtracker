from typing import AsyncGenerator
from datetime import timezone, datetime

from foodtracker_app.settings import settings
from sqlalchemy import TypeDecorator, DateTime
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base


class TZDateTime(TypeDecorator):
    impl = DateTime
    cache_ok = True

    def process_bind_param(self, value: datetime | None, dialect) -> datetime | None:
        if value is not None:
            if not value.tzinfo:
                pass
            return value.astimezone(timezone.utc).replace(tzinfo=None)
        return None

    def process_result_value(self, value: datetime | None, dialect) -> datetime | None:
        if value is not None:
            return value.replace(tzinfo=timezone.utc)
        return None


DATABASE_URL = settings.DATABASE_URL

engine = create_async_engine(DATABASE_URL, echo=True)
async_session_maker = async_sessionmaker(engine, expire_on_commit=False)

Base = declarative_base()


async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        yield session
