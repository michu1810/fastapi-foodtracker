from sqlalchemy import func, select, case
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from foodtracker_app.models import Product, Category
from foodtracker_app.schemas.statistics import CategoryWasteStat, MostWastedProductStat


async def get_category_waste_stats(
    db: AsyncSession, pantry_id: int
) -> List[CategoryWasteStat]:
    """
    Oblicza statystyki zużytych i zmarnowanych ilości produktów,
    grupując je według kategorii dla danej spiżarni.
    Osobno sumuje produkty w 'szt.' i 'g'.
    Uwzględnia WSZYSTKIE produkty, także te bez przypisanej kategorii.
    """
    saved_amount_expr = (
        Product.initial_amount - Product.current_amount - Product.wasted_amount
    )

    sum_saved_szt = func.sum(case((Product.unit == "szt.", saved_amount_expr), else_=0))
    sum_wasted_szt = func.sum(
        case((Product.unit == "szt.", Product.wasted_amount), else_=0)
    )

    sum_saved_grams = func.sum(case((Product.unit == "g", saved_amount_expr), else_=0))
    sum_wasted_grams = func.sum(
        case((Product.unit == "g", Product.wasted_amount), else_=0)
    )

    stmt = (
        select(
            func.coalesce(Category.name, "Inne").label("category_name"),
            Category.icon_name.label("icon_name"),
            sum_saved_szt.label("total_saved_szt"),
            sum_wasted_szt.label("total_wasted_szt"),
            sum_saved_grams.label("total_saved_grams"),
            sum_wasted_grams.label("total_wasted_grams"),
        )
        .join(Category, Product.category_id == Category.id, isouter=True)
        .where(Product.pantry_id == pantry_id)
        .group_by(Category.name, Category.icon_name)  # Poprawna klauzula GROUP BY
        .having(
            (sum_saved_szt > 0)
            | (sum_wasted_szt > 0)
            | (sum_saved_grams > 0)
            | (sum_wasted_grams > 0)
        )
        .order_by(func.coalesce(Category.name, "Inne"))
    )

    result = await db.execute(stmt)
    stats_from_db = result.all()

    return [
        CategoryWasteStat(
            category_name=row.category_name,
            icon_name=row.icon_name if row.category_name != "Inne" else "other",
            saved_szt=float(row.total_saved_szt or 0.0),
            wasted_szt=float(row.total_wasted_szt or 0.0),
            saved_grams=float(row.total_saved_grams or 0.0),
            wasted_grams=float(row.total_wasted_grams or 0.0),
        )
        for row in stats_from_db
    ]


async def get_most_expensive_wasted_products(
    db: AsyncSession, pantry_id: int, limit: int = 3
) -> List[MostWastedProductStat]:
    """
    Znajduje produkty o najwyższej wartości finansowej, które zostały wyrzucone.
    """

    # Wyrażenie obliczające wartość zmarnowanej części produktu
    wasted_value_expr = (Product.price / Product.initial_amount) * Product.wasted_amount

    stmt = (
        select(Product.id, Product.name, wasted_value_expr.label("wasted_value"))
        .where(
            Product.pantry_id == pantry_id,
            Product.wasted_amount > 0,
            Product.initial_amount > 0,  # Unikamy dzielenia przez zero
        )
        .order_by(wasted_value_expr.desc())
        .limit(limit)
    )

    result = await db.execute(stmt)
    products = result.all()

    return [
        MostWastedProductStat(
            id=p.id, name=p.name, wasted_value=float(p.wasted_value or 0.0)
        )
        for p in products
    ]
