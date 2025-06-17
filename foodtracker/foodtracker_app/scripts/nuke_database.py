import asyncio

from foodtracker_app.db.database import Base, engine
from sqlalchemy import text


async def drop_all_tables():
    print("🗑️ Rozpoczynanie usuwania wszystkich tabel...")
    async with engine.begin() as conn:
        await conn.execute(text("SET session_replication_role = 'replica';"))

        await conn.run_sync(Base.metadata.drop_all)

        await conn.execute(text("SET session_replication_role = 'origin';"))

    print("✅ Wszystkie tabele zostały usunięte.")


if __name__ == "__main__":
    asyncio.run(drop_all_tables())
