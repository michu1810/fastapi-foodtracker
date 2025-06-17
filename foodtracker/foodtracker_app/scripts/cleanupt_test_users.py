import asyncio

from foodtracker_app.db.database import async_session_maker
from foodtracker_app.models.user import User
from sqlalchemy import delete, select


async def delete_test_users():
    async with async_session_maker() as session:
        result = await session.execute(
            select(User).where(User.email.ilike("test%@example.com"))
        )
        users = result.scalars().all()
        print(f"🧹 Usuwam {len(users)} użytkowników testowych...")

        await session.execute(delete(User).where(User.email.ilike("test%@example.com")))
        await session.commit()
        print("✅ Gotowe.")


if __name__ == "__main__":
    asyncio.run(delete_test_users())


# UWAGA TEN SKRYPT USUWA WSZYSTKICH UZYTKOWNIKOW Z BAZY DANYCH Z PRZEDROSTKIEM TEST W MAILU !!!!
