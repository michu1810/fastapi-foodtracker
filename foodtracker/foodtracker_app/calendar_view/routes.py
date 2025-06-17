from datetime import date
from typing import List

from fastapi import APIRouter, Depends, Query
from foodtracker_app.auth.dependancies import get_current_user
from foodtracker_app.auth.schemas import ProductOut
from foodtracker_app.db.database import get_async_session
from foodtracker_app.models.product import Product
from foodtracker_app.models.user import User
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

router = APIRouter(prefix="/calendar_view", tags=["Calendar"])


@router.get("/", response_model=List[ProductOut])
async def get_products_by_date(
    date_query: date = Query(..., alias="date"),
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Product).where(
        Product.user_id == current_user.id, Product.expiration_date == date_query
    )
    result = await session.execute(stmt)
    return result.scalars().all()


@router.get("/all", response_model=List[ProductOut])
async def get_all_products(
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Product).where(Product.user_id == current_user.id)
    result = await session.execute(stmt)
    return result.scalars().all()
