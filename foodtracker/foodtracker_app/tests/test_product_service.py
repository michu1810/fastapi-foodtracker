import pytest
from datetime import date, timedelta
from unittest.mock import AsyncMock

from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from sqlalchemy import select
from foodtracker_app.services import product_service
from foodtracker_app.auth.schemas import ProductCreate
from foodtracker_app.models import Category, Pantry


pytestmark = pytest.mark.asyncio


# Fikstura do przygotowania kategorii w bazie danych przed testami
@pytest.fixture(autouse=True)
async def seed_categories_for_service(db: AsyncSession):
    """Automatycznie dodaje podstawowe kategorie do bazy przed każdym testem w tym module."""
    categories_to_seed = [
        Category(name="Mięso"),
        Category(name="Nabiał"),
        Category(name="Inne"),
    ]
    db.add_all(categories_to_seed)
    await db.commit()


# Fikstura do stworzenia testowej spiżarni
@pytest.fixture
async def test_pantry(db: AsyncSession):
    """Tworzy i zwraca testową spiżarnię."""
    pantry = Pantry(name="Test Pantry", owner_id=1)  # owner_id jest tu symboliczny
    db.add(pantry)
    await db.commit()
    return pantry


# === Testy dla logiki "świeżych produktów" ===


async def test_create_fresh_product_calculates_expiration_date(
    db: AsyncSession, test_pantry: Pantry
):
    """
    Testuje, czy serwis poprawnie oblicza datę ważności dla świeżego produktu.
    To pokryje ścieżkę: if product_data.is_fresh_product:
    """
    today = date.today()
    product_data = ProductCreate(
        name="Świeży kurczak",
        price=19.99,
        unit="kg",
        initial_amount=1.0,
        is_fresh_product=True,
        purchase_date=today,
        shelf_life_days=5,
    )

    created_product = await product_service.create_product(
        db, test_pantry.id, product_data
    )

    expected_expiration_date = today + timedelta(days=5)
    assert created_product.expiration_date == expected_expiration_date
    assert created_product.name == "Świeży kurczak"


async def test_create_fresh_product_missing_data_raises_error(
    db: AsyncSession, test_pantry: Pantry
):
    """
    Testuje, czy serwis rzuca błąd 422, gdy brakuje danych dla świeżego produktu.
    To pokryje warunek: if not product_data.purchase_date...
    """
    product_data = ProductCreate(
        name="Niekompletny świeży produkt",
        price=10.0,
        unit="szt.",
        initial_amount=1,
        is_fresh_product=True,
        # Celowo brak `purchase_date` i `shelf_life_days`
    )

    with pytest.raises(HTTPException) as excinfo:
        await product_service.create_product(db, test_pantry.id, product_data)

    assert excinfo.value.status_code == 422
    assert "Brakuje daty zakupu" in excinfo.value.detail


# === Testy dla automatycznego przypisywania kategorii z Open Food Facts ===


async def test_create_product_with_category_from_off(
    db: AsyncSession, test_pantry: Pantry, mocker
):
    """
    Testuje automatyczne przypisanie kategorii z Open Food Facts, gdy category_id nie jest podane.
    To pokryje całą logikę funkcji _get_category_from_off.
    """
    # 1. Mockujemy odpowiedź z API, aby nie robić prawdziwego zapytania sieciowego
    mock_off_response = mocker.patch(
        "foodtracker_app.services.product_service._get_category_from_off",
        new=AsyncMock(),
    )

    # Symulujemy, że dla podanego kodu kreskowego znaleziono kategorię "Mięso"
    meat_category = await db.get(Category, 1)  # Zakładając, że "Mięso" ma ID 1
    mock_off_response.return_value = meat_category

    # 2. Tworzymy produkt bez `category_id`, ale z `external_id`
    product_data = ProductCreate(
        name="Kiełbasa z Kodu",
        price=25.50,
        unit="kg",
        initial_amount=0.5,
        expiration_date=date.today() + timedelta(days=10),
        external_id="123456789",  # Fikcyjny kod kreskowy
    )

    # 3. Wywołujemy serwis i sprawdzamy wynik
    created_product = await product_service.create_product(
        db, test_pantry.id, product_data
    )

    # 4. Asercje
    mock_off_response.assert_awaited_once_with(db, "123456789")
    assert created_product.category is not None
    assert created_product.category.name == "Mięso"
    assert created_product.category_id == meat_category.id


async def test_create_product_fallback_to_other_category_if_off_fails(
    db: AsyncSession, test_pantry: Pantry, mocker
):
    """
    Testuje przypisanie kategorii "Inne", gdy Open Food Facts nie zwróciło pasującej kategorii.
    To pokryje ścieżkę: else: ... (fallback do "Inne")
    """
    # 1. Mockujemy odpowiedź z API, symulując brak znalezienia kategorii
    mock_off_response = mocker.patch(
        "foodtracker_app.services.product_service._get_category_from_off",
        new=AsyncMock(return_value=None),
    )

    other_category = await db.scalar(select(Category).where(Category.name == "Inne"))

    # 2. Tworzymy produkt bez `category_id`, ale z `external_id`
    product_data = ProductCreate(
        name="Dziwny produkt z OFF",
        price=5.0,
        unit="szt.",
        initial_amount="1",
        expiration_date=date.today() + timedelta(days=5),
        external_id="987654321",
    )

    # 3. Wywołujemy serwis
    created_product = await product_service.create_product(
        db, test_pantry.id, product_data
    )

    # 4. Asercje
    mock_off_response.assert_awaited_once_with(db, "987654321")
    assert created_product.category is not None
    assert created_product.category.name == "Inne"
    assert created_product.category_id == other_category.id


# === Test dla ostatniej brakującej funkcji ===


async def test_resolve_category_from_external_id(db: AsyncSession, mocker):
    """
    Testuje bezpośrednio funkcję pomocniczą resolve_category_from_external_id.
    To pokryje linie 127-128.
    """
    mock_off_response = mocker.patch(
        "foodtracker_app.services.product_service._get_category_from_off",
        new=AsyncMock(),
    )
    meat_category = await db.get(Category, 1)
    mock_off_response.return_value = meat_category

    resolved_category = await product_service.resolve_category_from_external_id(
        db, "111222333"
    )

    mock_off_response.assert_awaited_once_with(db, "111222333")
    assert resolved_category is not None
    assert resolved_category.name == "Mięso"
