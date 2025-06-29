from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from ..models.category import Category

CATEGORIES_TO_SEED = [
    {"name": "Nabiał", "icon_name": "dairy"},
    {"name": "Warzywa", "icon_name": "vegetables"},
    {"name": "Owoce", "icon_name": "fruits"},
    {"name": "Mięso", "icon_name": "meat"},
    {"name": "Ryby i owoce morza", "icon_name": "fish_seafood"},
    {"name": "Pieczywo", "icon_name": "bakery"},
    {"name": "Napoje", "icon_name": "beverages"},
    {"name": "Słodycze i przekąski", "icon_name": "sweets_snacks"},
    {"name": "Produkty sypkie", "icon_name": "dry_goods"},
    {"name": "Mrożonki", "icon_name": "frozen"},
    {"name": "Inne", "icon_name": "other"},
]


async def seed_categories(db: AsyncSession):
    """
    Sprawdza i wypełnia tabelę kategorii, jeśli jest pusta.
    """
    print("Sprawdzanie, czy kategorie istnieją w bazie danych...")

    result = await db.execute(select(Category))
    if result.scalars().first() is not None:
        print("Kategorie już istnieją. Pomijam seedowanie.")
        return

    print("Baza danych jest pusta. Wypełnianie kategoriami...")
    for category_data in CATEGORIES_TO_SEED:
        new_category = Category(**category_data)
        db.add(new_category)
        print(f"Przygotowano do dodania: {category_data['name']}")

    await db.commit()
    print("Seedowanie kategorii zakończone pomyślnie.")
