import httpx
import logging
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException
from datetime import date, timedelta
from decimal import Decimal

from foodtracker_app.models.category import Category
from foodtracker_app.models.product import Product
from foodtracker_app.auth.schemas import ProductCreate

CATEGORY_KEYWORD_MAP = {
    "Nabiał": [
        "dairies",
        "cheese",
        "yogurt",
        "milk",
        "butter",
        "cream",
        "fermented-milks",
    ],
    "Mięso": ["meats", "sausages", "poultry", "beef", "pork", "charcuteries"],
    "Ryby i owoce morza": ["seafood", "fishes"],
    "Warzywa": ["vegetables", "legumes", "plant-based-foods"],
    "Owoce": ["fruits"],
    "Pieczywo": ["breads", "buns", "pastries", "bakery", "viennoiseries"],
    "Napoje": ["beverages", "juices", "sodas", "drinks", "teas", "coffees", "waters"],
    "Słodycze i przekąski": [
        "sugary-snacks",
        "confectioneries",
        "chocolates",
        "biscuits-and-cakes",
        "desserts",
        "candies",
        "chips",
    ],
    "Produkty sypkie": ["groceries", "flours", "cereals", "rice", "pasta"],
    "Mrożonki": ["frozen-foods"],
}


async def _get_category_from_off(
    db: AsyncSession, external_id: str
) -> Optional[Category]:
    """
    Pobiera dane z Open Food Facts i próbuje zmapować kategorię na naszą wewnętrzną.
    ULEPSZONA WERSJA Z DOKŁADNYM LOGOWANIEM BŁĘDÓW.
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"https://world.openfoodfacts.org/api/v2/product/{external_id}.json"
            )
            response.raise_for_status()
            data = response.json()

        if data.get("status") != 1 or "product" not in data:
            return None

        off_tags = [
            tag.replace("en:", "") for tag in data["product"].get("categories_tags", [])
        ]
        if not off_tags:
            return None

        found_category_name: Optional[str] = None
        for internal_category, keywords in CATEGORY_KEYWORD_MAP.items():
            if any(keyword in tag for keyword in keywords for tag in off_tags):
                found_category_name = internal_category
                break

        if found_category_name:
            result = await db.execute(
                select(Category).filter_by(name=found_category_name)
            )
            return result.scalars().first()

        return None
    except httpx.HTTPStatusError as e:
        logging.error(
            f"Błąd HTTP {e.response.status_code} podczas zapytania do Open Food Facts dla ID {external_id}."
        )
        return None
    except Exception:
        logging.error(
            f"Nieoczekiwany błąd podczas przetwarzania danych z OFF dla ID {external_id}",
            exc_info=True,
        )
        return None


async def create_product(
    db: AsyncSession, pantry_id: int, product_data: ProductCreate
) -> Product:
    """
    Tworzy nowy produkt, zawierając logikę walidacji, obliczania daty i przypisywania kategorii.
    """
    final_expiration_date = product_data.expiration_date
    if product_data.is_fresh_product:
        if not product_data.purchase_date or not product_data.shelf_life_days:
            raise HTTPException(
                status_code=422,
                detail="Brakuje daty zakupu lub okresu przydatności dla świeżego produktu.",
            )
        final_expiration_date = product_data.purchase_date + timedelta(
            days=product_data.shelf_life_days
        )
    if not final_expiration_date:
        raise HTTPException(status_code=422, detail="Data ważności jest wymagana.")
    if final_expiration_date < date.today():
        raise HTTPException(
            status_code=422, detail="Data ważności nie może być z przeszłości."
        )

    category_id = product_data.category_id
    if not category_id and product_data.external_id:
        category = await _get_category_from_off(db, product_data.external_id)
        if category:
            category_id = category.id
        else:
            result = await db.execute(select(Category).filter_by(name="Inne"))
            other_category = result.scalars().first()
            if other_category:
                category_id = other_category.id

    db_product = Product(
        name=product_data.name,
        expiration_date=final_expiration_date,
        pantry_id=pantry_id,
        external_id=product_data.external_id,
        category_id=category_id,
        price=Decimal(str(product_data.price)),
        unit=product_data.unit,
        initial_amount=Decimal(str(product_data.initial_amount)),
        current_amount=Decimal(str(product_data.initial_amount)),
        wasted_amount=Decimal(0),
    )

    db.add(db_product)
    await db.commit()

    result = await db.execute(
        select(Product)
        .options(selectinload(Product.category))
        .filter(Product.id == db_product.id)
    )
    final_product = result.scalars().one()

    return final_product


async def resolve_category_from_external_id(
    db: AsyncSession, external_id: str
) -> Optional[Category]:
    """
    Używa istniejącej logiki do znalezienia i zwrócenia obiektu kategorii
    na podstawie external_id z Open Food Facts.
    """
    category = await _get_category_from_off(db, external_id)
    return category
