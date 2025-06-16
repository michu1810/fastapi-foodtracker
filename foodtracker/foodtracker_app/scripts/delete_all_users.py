import asyncio
from sqlalchemy import delete
from foodtracker_app.db.database import async_session_maker
from foodtracker_app.models.user import User
from foodtracker_app.models.product import Product
from foodtracker_app.models.financial_stats import FinancialStat

async def delete_all_users_and_products():
    async with async_session_maker() as session:
        await session.execute(delete(Product))
        await session.execute(delete(FinancialStat))
        await session.execute(delete(User))
        await session.commit()
        print("✅ Wszyscy użytkownicy i ich produkty z finansowymi statystykami zostali usunięci.")

if __name__ == "__main__":
    asyncio.run(delete_all_users_and_products())