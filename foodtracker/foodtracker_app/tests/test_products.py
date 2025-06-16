from datetime import date, timedelta
import pytest

# Test tworzenia produktu
async def test_create_product_success(authenticated_client):

    response = authenticated_client.post(
        "/products/create",
        json={
            "name": "jabłko",
            "expiration_date": str(date.today() + timedelta(days=2)),
            "quantity": 2
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "jabłko"
    assert data["quantity_initial"] == 2
    assert data["quantity_current"] == 2
    assert "id" in data

# Test GET /get produktów
async def test_get_products_authenticated(authenticated_client):

    response = authenticated_client.get("/products/get")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

# Test bez autoryzacji
async def test_get_products_unauthenticated(client):

    response = client.get("/products/get")
    assert response.status_code == 401  # unauthorized

# Test walidacji: niepoprawna data
async def test_create_product_with_past_expiration(authenticated_client):
    response = authenticated_client.post(
        "/products/create",
        json={
            "name": "stare jajko",
            "expiration_date": str(date.today() - timedelta(days=1)),
            "quantity": 1
        }
    )
    assert response.status_code == 422

# Test zużycia produktu (POST /use/{id})
async def test_use_product(authenticated_client, product_in_db):
    product_id = product_in_db["id"]

    use_response = authenticated_client.post(
        f"/products/use/{product_id}",
        json={"quantity": 1}
    )
    assert use_response.status_code == 200
    # Oczekiwana ilość to 5 (z fixtury) - 1 (zużyte) = 4
    assert use_response.json()["quantity_current"] == 4


# Test statystyki
async def test_get_product_stats(authenticated_client):
    response = authenticated_client.get("/products/stats")
    assert response.status_code == 200
    data = response.json()
    assert "total" in data
    assert "used" in data
    assert "wasted" in data


async def test_user_cannot_access_other_users_product(authenticated_client_factory):
    """
    Sprawdza, czy użytkownik B nie może pobrać, edytować ani usunąć produktu użytkownika A.
    """
    # 1. Stwórz i zaloguj Użytkownika A
    client_a = await authenticated_client_factory("user.a@example.com", "password123")

    # 2. Użytkownik A tworzy produkt
    create_response = client_a.post(
        "/products/create",
        json={
            "name": "Dziennik Usera A",
            "expiration_date": str(date.today() + timedelta(days=10)),
            "quantity": 1
        }
    )
    assert create_response.status_code == 201
    product_id = create_response.json()["id"]

    client_b = await authenticated_client_factory("user.b@example.com", "password456")

    get_response = client_b.get(f"/products/get/{product_id}")
    assert get_response.status_code == 404

    delete_response = client_b.delete(f"/products/delete/{product_id}")
    assert delete_response.status_code == 404

    use_response = client_b.post(f"/products/use/{product_id}", json={"quantity": 1})
    assert use_response.status_code == 404


async def test_use_product_more_than_available(authenticated_client_factory):
    """
    Sprawdza, czy API zwraca błąd 400, gdy próbujemy zużyć więcej produktu niż jest na stanie.
    """
    client = await authenticated_client_factory("test.user@example.com", "password123")

    # Utwórz produkt z ilością 2
    create_res = client.post(
        "/products/create",
        json={
            "name": "Mleko",
            "expiration_date": str(date.today() + timedelta(days=5)),
            "quantity": 2
        }
    )
    assert create_res.status_code == 201
    product_id = create_res.json()["id"]

    # Spróbuj zużyć 3 sztuki
    use_res = client.post(f"/products/use/{product_id}", json={"quantity": 3})

    # Oczekujemy błędu 400 Bad Request
    assert use_res.status_code == 400
    assert "Nie możesz zużyć" in use_res.json()["detail"]


@pytest.mark.parametrize("payload, expected_detail", [
    ({
         "name": "Brak ilości",
         "expiration_date": str(date.today() + timedelta(days=1))
     }, "Field required"),

    ({
         "name": "Ujemna ilość",
         "expiration_date": str(date.today() + timedelta(days=1)),
         "quantity": -1
     }, "Input should be greater than 0"),

    ({
         "name": "Zerowa ilość",
         "expiration_date": str(date.today() + timedelta(days=1)),
         "quantity": 0
     }, "Input should be greater than 0")
])
async def test_create_product_with_invalid_data(authenticated_client_factory, payload, expected_detail):
    """
    Sprawdza, czy API zwraca błąd 422 dla niepoprawnych danych wejściowych.
    """
    client = await authenticated_client_factory("validator.user@example.com", "password123")

    response = client.post("/products/create", json=payload)

    assert response.status_code == 422
    assert any(expected_detail in error["msg"] for error in response.json()["detail"])


async def test_use_exact_quantity_of_product(authenticated_client):
    """
    Sprawdza, czy można zużyć dokładnie całą dostępną ilość produktu.
    """
    # 1. Stwórz produkt o ilości 2
    create_response = authenticated_client.post(
        "/products/create",
        json={
            "name": "Awokado",
            "expiration_date": str(date.today() + timedelta(days=3)),
            "quantity": 2
        }
    )
    assert create_response.status_code == 201
    product_id = create_response.json()["id"]

    # 2. Zużyj dokładnie 2 sztuki
    use_response = authenticated_client.post(
        f"/products/use/{product_id}",
        json={"quantity": 2}
    )

    # 3. Sprawdź, czy operacja się powiodła, a ilość wynosi 0
    assert use_response.status_code == 200
    data = use_response.json()
    assert data["quantity_current"] == 0
    assert data["name"] == "Awokado"


async def test_access_deleted_product_fails(authenticated_client):
    """
    Sprawdza, czy próba dostępu do usuniętego produktu zwraca błąd 404.
    """
    # 1. Stwórz produkt
    create_response = authenticated_client.post(
        "/products/create",
        json={
            "name": "Produkt do usunięcia",
            "expiration_date": str(date.today() + timedelta(days=1)),
            "quantity": 1
        }
    )
    product_id = create_response.json()["id"]

    # 2. Usuń produkt
    delete_response = authenticated_client.delete(f"/products/delete/{product_id}")
    assert delete_response.status_code == 204  # 204 No Content to standardowa odpowiedź dla DELETE

    # 3. Spróbuj pobrać usunięty produkt
    get_response = authenticated_client.get(f"/products/get/{product_id}")
    assert get_response.status_code == 404



async def test_get_product_stats_with_real_data(authenticated_client):
    """
    Sprawdza, czy statystyki poprawnie odzwierciedlają wykonane akcje.
    """
    # 1. Stwórz produkt A (2 sztuki) i zużyj 1
    res_a = authenticated_client.post("/products/create", json={"name": "Chleb", "expiration_date": str(date.today() + timedelta(days=2)), "quantity": 2})
    product_a_id = res_a.json()["id"]
    authenticated_client.post(f"/products/use/{product_a_id}", json={"quantity": 1})

    # 2. Stwórz produkt B (5 sztuk) i nie ruszaj go
    authenticated_client.post("/products/create", json={"name": "Mleko", "expiration_date": str(date.today() + timedelta(days=5)), "quantity": 5})

    # 3. Pobierz statystyki
    stats_response = authenticated_client.get("/products/stats")
    assert stats_response.status_code == 200
    stats = stats_response.json()

    # 4. Sprawdź wartości (zakładając, że nie ma innych produktów i zmarnowanych)
    assert stats["total"] == 7  # 2 (chleb) + 5 (mleko)
    assert stats["used"] == 1   # 1 zużyty chleb
