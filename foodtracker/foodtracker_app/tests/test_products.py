from datetime import timedelta, date

import pytest


# Test tworzenia produktu
async def test_create_product_success(authenticated_client, fixed_date):
    payload = {
        "name": "Mleko",
        "expiration_date": str(fixed_date + timedelta(days=7)),
        "price": 3.50,
        "unit": "l",
        "initial_amount": 1.0,
    }
    response = await authenticated_client.post("/products/create", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Mleko"
    assert float(data["initial_amount"]) == 1.0


# Test GET /get produktów
async def test_get_products_authenticated(authenticated_client):
    response = await authenticated_client.get("/products/get")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


# Test bez autoryzacji
async def test_get_products_unauthenticated(client):
    response = await client.get("/products/get")
    assert response.status_code == 401


async def test_create_product_with_past_expiration(authenticated_client, fixed_date):
    response = await authenticated_client.post(
        "/products/create",
        json={
            "name": "stare jajko",
            "expiration_date": str((date.today() - timedelta(days=1))),
            "price": 1.0,
            "unit": "szt.",
            "initial_amount": 1,
        },
    )
    assert response.status_code == 422


async def test_use_product(authenticated_client, product_in_db):
    product_id = product_in_db["id"]
    initial_amount = float(product_in_db["initial_amount"])
    amount_to_use = 1.0
    use_response = await authenticated_client.post(
        f"/products/use/{product_id}", json={"amount": amount_to_use}
    )
    assert use_response.status_code == 200
    data = use_response.json()["product"]
    assert float(data["current_amount"]) == initial_amount - amount_to_use


async def test_get_product_stats(authenticated_client):
    response = await authenticated_client.get("/products/stats")
    assert response.status_code == 200


async def test_user_cannot_access_other_users_product(
    authenticated_client_factory, fixed_date
):
    client_a = await authenticated_client_factory("user.a@example.com", "password123")
    create_response = await client_a.post(
        "/products/create",
        json={
            "name": "Produkt Usera A",
            "expiration_date": str(fixed_date),
            "price": 5.0,
            "unit": "szt.",
            "initial_amount": 1,
        },
    )
    assert create_response.status_code == 201
    product_id = create_response.json()["id"]
    client_b = await authenticated_client_factory("user.b@example.com", "password456")
    get_response = await client_b.get(f"/products/get/{product_id}")
    assert get_response.status_code == 404


async def test_use_product_more_than_available(
    authenticated_client_factory, fixed_date
):
    client = await authenticated_client_factory(
        "test.user.amount@example.com", "password123"
    )
    create_res = await client.post(
        "/products/create",
        json={
            "name": "Mleko",
            "expiration_date": str(fixed_date),
            "price": 3.0,
            "unit": "l",
            "initial_amount": 2.0,
        },
    )
    assert create_res.status_code == 201
    product_id = create_res.json()["id"]
    use_res = await client.post(f"/products/use/{product_id}", json={"amount": 3.0})
    assert use_res.status_code == 400


@pytest.mark.parametrize(
    "payload, expected_detail_part",
    [
        (
            {"name": "Brak daty", "price": 1, "unit": "szt.", "initial_amount": 1},
            "Data ważności jest wymagana",
        ),
        (
            {
                "name": "Produkt",
                "expiration_date": "2025-06-17",
                "price": -1,
                "unit": "szt.",
                "initial_amount": 1,
            },
            "Input should be greater than 0",
        ),
        (
            {
                "name": "Produkt",
                "expiration_date": "2025-06-17",
                "price": 1,
                "unit": "szt.",
                "initial_amount": 0,
            },
            "Input should be greater than 0",
        ),
    ],
)
async def test_create_product_with_invalid_data(
    authenticated_client_factory, payload, expected_detail_part, fixed_date
):
    if "expiration_date" in payload:
        payload["expiration_date"] = str(fixed_date)
    client = await authenticated_client_factory(
        "validator.user@example.com", "password123"
    )
    response = await client.post("/products/create", json=payload)
    assert response.status_code == 422
    assert expected_detail_part in str(response.json()["detail"])


async def test_use_exact_quantity_of_product(authenticated_client, fixed_date):
    create_response = await authenticated_client.post(
        "/products/create",
        json={
            "name": "Awokado",
            "expiration_date": str(fixed_date),
            "price": 7.0,
            "unit": "szt.",
            "initial_amount": 2,
        },
    )
    assert create_response.status_code == 201
    product_id = create_response.json()["id"]
    use_response = await authenticated_client.post(
        f"/products/use/{product_id}", json={"amount": 2}
    )
    assert use_response.status_code == 200
    assert float(use_response.json()["product"]["current_amount"]) == 0


async def test_access_deleted_product_fails(authenticated_client, fixed_date):
    create_response = await authenticated_client.post(
        "/products/create",
        json={
            "name": "Do usunięcia",
            "expiration_date": str(fixed_date),
            "price": 1.0,
            "unit": "szt.",
            "initial_amount": 1,
        },
    )
    assert create_response.status_code == 201
    product_id = create_response.json()["id"]
    delete_response = await authenticated_client.delete(
        f"/products/delete/{product_id}"
    )
    assert delete_response.status_code == 204
    get_response = await authenticated_client.get(f"/products/get/{product_id}")
    assert get_response.status_code == 404


async def test_get_product_stats_with_real_data(
    authenticated_client_factory, fixed_date
):
    client = await authenticated_client_factory("stats.user@example.com", "password123")
    res_a = await client.post(
        "/products/create",
        json={
            "name": "Chleb",
            "expiration_date": str(fixed_date + timedelta(days=2)),
            "price": 5,
            "unit": "szt.",
            "initial_amount": 2,
        },
    )
    assert res_a.status_code == 201
    product_a_id = res_a.json()["id"]
    await client.post(f"/products/use/{product_a_id}", json={"amount": 1})
    res_b = await client.post(
        "/products/create",
        json={
            "name": "Mleko",
            "expiration_date": str(fixed_date + timedelta(days=5)),
            "price": 3,
            "unit": "szt.",
            "initial_amount": 5,
        },
    )
    assert res_b.status_code == 201
    stats_response = await client.get("/products/stats")
    assert stats_response.status_code == 200
    stats = stats_response.json()
    assert stats["total"] == 7
    assert stats["used"] == 1
