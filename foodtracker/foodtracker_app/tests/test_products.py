from datetime import date, timedelta
from decimal import Decimal
import pytest
from httpx import AsyncClient
from typing import Callable, Coroutine, Tuple
from foodtracker_app.models import Pantry

pytestmark = pytest.mark.asyncio


async def test_create_product_success(
    authenticated_client: AsyncClient, fixed_date: date
):
    pantry_id = authenticated_client.pantry.id  # type: ignore
    payload = {
        "name": "Mleko",
        "expiration_date": str(fixed_date + timedelta(days=7)),
        "price": 3.50,
        "unit": "l",
        "initial_amount": 1.0,
    }
    response = await authenticated_client.post(
        f"/pantries/{pantry_id}/products/create", json=payload
    )

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Mleko"
    assert Decimal(data["initial_amount"]) == Decimal("1.0")


async def test_get_products_authenticated(authenticated_client: AsyncClient):
    pantry_id = authenticated_client.pantry.id  # type: ignore
    response = await authenticated_client.get(f"/pantries/{pantry_id}/products/get")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


async def test_get_products_unauthenticated(client: AsyncClient):
    response = await client.get("/pantries/999/products/get")
    assert response.status_code == 401


async def test_create_product_with_past_expiration(authenticated_client: AsyncClient):
    pantry_id = authenticated_client.pantry.id  # type: ignore
    response = await authenticated_client.post(
        f"/pantries/{pantry_id}/products/create",
        json={
            "name": "Stare jajko",
            "expiration_date": str(date.today() - timedelta(days=1)),
            "price": 1.0,
            "unit": "szt.",
            "initial_amount": 1,
        },
    )
    assert response.status_code == 422


async def test_use_product(authenticated_client: AsyncClient, fixed_date: date):
    pantry_id = authenticated_client.pantry.id  # type: ignore

    create_payload = {
        "name": "Produkt do zużycia",
        "expiration_date": str(fixed_date),
        "price": 10.0,
        "unit": "szt.",
        "initial_amount": 5,
        "current_amount": 5,
    }
    create_resp = await authenticated_client.post(
        f"/pantries/{pantry_id}/products/create", json=create_payload
    )
    assert create_resp.status_code == 201
    product = create_resp.json()
    product_id = product["id"]
    initial_amount = Decimal(product["initial_amount"])
    amount_to_use = Decimal("1.0")

    use_response = await authenticated_client.post(
        f"/pantries/{pantry_id}/products/use/{product_id}",
        json={"amount": float(amount_to_use)},
    )
    assert use_response.status_code == 200
    data = use_response.json()["product"]
    assert Decimal(data["current_amount"]) == initial_amount - amount_to_use


async def test_user_cannot_access_other_users_pantry_products(
    authenticated_client_factory: Callable[
        ..., Coroutine[any, any, Tuple[AsyncClient, Pantry]]
    ],
    fixed_date: date,
):
    client_a, pantry_a = await authenticated_client_factory(
        "user.a@example.com", "password123"
    )
    create_response = await client_a.post(
        f"/pantries/{pantry_a.id}/products/create",
        json={
            "name": "Produkt A",
            "expiration_date": str(fixed_date),
            "price": 1,
            "unit": "szt.",
            "initial_amount": 1,
        },
    )
    assert create_response.status_code == 201
    product_id_a = create_response.json()["id"]

    client_b, _ = await authenticated_client_factory(
        "user.b@example.com", "password456"
    )

    get_list_response = await client_b.get(f"/pantries/{pantry_a.id}/products/get")
    assert get_list_response.status_code in [403, 404]

    get_product_response = await client_b.get(
        f"/pantries/{pantry_a.id}/products/get/{product_id_a}"
    )
    assert get_product_response.status_code in [403, 404]
