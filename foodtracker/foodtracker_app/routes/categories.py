from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from foodtracker_app.db.database import get_async_session
from foodtracker_app.models import Category
from foodtracker_app.schemas.category import CategoryRead

router = APIRouter()


@router.get(
    "/",
    response_model=List[CategoryRead],
    summary="Pobierz listę wszystkich kategorii",
    tags=["Categories"],
)
async def get_all_categories(db: AsyncSession = Depends(get_async_session)):
    """
    Zwraca listę wszystkich dostępnych kategorii produktów.
    """
    result = await db.execute(select(Category).order_by(Category.name))
    categories = result.scalars().all()
    return categories
