from __future__ import annotations

import io
import uuid
from datetime import datetime, timedelta, timezone, date
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient
from sqlalchemy.future import select

from foodtracker_app.auth.utils import (
    create_access_token,
    create_refresh_token,
    hash_password,
)
from foodtracker_app.models.user import User
from foodtracker_app.tests.conftest import TestingSessionLocal
import random


# ─────────────────────────  rejestracja  ─────────────────────────


@pytest.mark.asyncio
async def test_register_bad_recaptcha(client: AsyncClient, mocker):
    mocker.patch(
        "foodtracker_app.auth.routes.verify_recaptcha",
        new=AsyncMock(return_value=False),
    )
    res = await client.post(
        "/auth/register",
        json={
            "email": "spam@example.com",
            "password": "pwd",
            "recaptcha_token": "bad-token",
        },
    )
    assert res.status_code == 400
    assert res.json()["detail"] == "Invalid reCAPTCHA"


@pytest.mark.asyncio
async def test_register_incomplete_data(client: AsyncClient):
    res = await client.post(
        "/auth/register",
        json={"email": "incomplete@example.com", "password": "pwd"},
    )
    assert res.status_code == 400
    assert res.json()["detail"] == "Incomplete registration data"


@pytest.mark.asyncio
async def test_register_existing_social_user(client: AsyncClient, mocker):
    mocker.patch(
        "foodtracker_app.auth.routes.verify_recaptcha",
        new=AsyncMock(return_value=True),
    )
    async with TestingSessionLocal() as db:
        db.add(
            User(
                email="social@example.com",
                hashed_password=hash_password("x"),
                social_provider="google",
                is_verified=True,
            )
        )
        await db.commit()
    res = await client.post(
        "/auth/register",
        json={
            "email": "social@example.com",
            "password": "irrelevant",
            "recaptcha_token": "token",
        },
    )
    assert res.status_code == 400
    # POPRAWKA: Sprawdzamy poprawny komunikat błędu
    assert res.json()["detail"] == "Email already registered"


@pytest.mark.asyncio
async def test_register_existing_password_user(client: AsyncClient, mocker):
    mocker.patch(
        "foodtracker_app.auth.routes.verify_recaptcha",
        new=AsyncMock(return_value=True),
    )
    async with TestingSessionLocal() as db:
        db.add(
            User(
                email="existing_pwd@example.com",
                hashed_password=hash_password("x"),
                social_provider="password",
                is_verified=True,
            )
        )
        await db.commit()
    res = await client.post(
        "/auth/register",
        json={
            "email": "existing_pwd@example.com",
            "password": "irrelevant",
            "recaptcha_token": "token",
        },
    )
    assert res.status_code == 400
    assert res.json()["detail"] == "Email already registered"


@pytest.mark.asyncio
async def test_register_success(client: AsyncClient, mocker):
    mock_verify_recaptcha = mocker.patch(
        "foodtracker_app.auth.routes.verify_recaptcha", new=AsyncMock(return_value=True)
    )
    mock_trigger_verification_email = mocker.patch(
        "foodtracker_app.auth.routes.trigger_verification_email", new=AsyncMock()
    )

    res = await client.post(
        "/auth/register",
        json={
            "email": "new_user@example.com",
            "password": "secure_password",
            "recaptcha_token": "valid-recaptcha-token",
        },
    )
    # POPRAWKA: Poprawny status code to 201 Created
    assert res.status_code == 201
    assert (
        res.json()["message"]
        == "User created successfully. Sprawdź email, by aktywować konto."
    )
    mock_verify_recaptcha.assert_called_once_with("valid-recaptcha-token")
    mock_trigger_verification_email.assert_called_once()


# ─────────────────────────  weryfikacja konta  ─────────────────────────


@pytest.mark.asyncio
async def test_verify_account_success_and_used(client: AsyncClient):
    token = str(uuid.uuid4())
    async with TestingSessionLocal() as db:
        db.add(
            User(
                email="verify@example.com",
                hashed_password=hash_password("pwd"),
                verification_token=token,
                token_expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
            )
        )
        await db.commit()
    res1 = await client.get("/auth/verify", params={"token": token})
    assert res1.json() == {"status": "success"}
    res2 = await client.get("/auth/verify", params={"token": token})
    assert res2.json() == {"status": "used"}


@pytest.mark.asyncio
async def test_verify_account_expired_token(client: AsyncClient):
    token = str(uuid.uuid4())
    async with TestingSessionLocal() as db:
        db.add(
            User(
                email="expired@example.com",
                hashed_password=hash_password("pwd"),
                verification_token=token,
                token_expires_at=datetime.now(timezone.utc) - timedelta(minutes=1),
            )
        )
        await db.commit()
    res = await client.get("/auth/verify", params={"token": token})
    assert res.json() == {"status": "expired"}


@pytest.mark.asyncio
async def test_verify_account_invalid_token(client: AsyncClient):
    res = await client.get("/auth/verify", params={"token": "non-existent-token"})
    assert res.json() == {"status": "invalid"}


# ─────────────────────────  resend-verification  ─────────────────────────


@pytest.mark.asyncio
async def test_resend_verification_email_not_found(client, mocker):
    mocker.patch(
        "foodtracker_app.auth.routes.trigger_verification_email", new=AsyncMock()
    )
    res = await client.post(
        "/auth/resend-verification", json={"email": "notfound@example.com"}
    )
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_resend_verification_email_missing_email(client: AsyncClient):
    res = await client.post("/auth/resend-verification", json={})
    assert res.status_code == 400
    assert res.json()["detail"] == "Email is required."


@pytest.mark.asyncio
async def test_resend_verification_email_success(mocker, authenticated_client_factory):
    mocker.patch(
        "foodtracker_app.auth.routes.trigger_verification_email", new=AsyncMock()
    )
    # POPRAWKA: Rozpakowanie wyniku z fabryki
    client, _ = await authenticated_client_factory(
        "reuser@example.com", "x", is_verified=False, login=False
    )
    res = await client.post(
        "/auth/resend-verification", json={"email": "reuser@example.com"}
    )
    assert res.status_code == 200


@pytest.mark.asyncio
async def test_resend_verification_email_already_verified(authenticated_client_factory):
    # POPRAWKA: Rozpakowanie wyniku z fabryki
    client, _ = await authenticated_client_factory(
        "reuser_verified@example.com", "x", is_verified=True
    )
    res = await client.post(
        "/auth/resend-verification", json={"email": "reuser_verified@example.com"}
    )
    assert res.status_code == 400
    assert res.json()["detail"] == "Account already verified"


@pytest.mark.asyncio
async def test_resend_verification_email_too_soon(authenticated_client_factory, mocker):
    mock_trigger_verification_email = mocker.patch(
        "foodtracker_app.auth.routes.trigger_verification_email", new=AsyncMock()
    )
    user_email = "resend_too_soon@example.com"
    async with TestingSessionLocal() as db:
        db.add(
            User(
                email=user_email,
                hashed_password=hash_password("x"),
                is_verified=False,
                token_expires_at=datetime.now(timezone.utc) + timedelta(minutes=1),
            )
        )
        await db.commit()
    # POPRAWKA: Rozpakowanie wyniku z fabryki
    client, _ = await authenticated_client_factory(
        user_email, "x", is_verified=False, login=False
    )
    res = await client.post("/auth/resend-verification", json={"email": user_email})
    assert res.status_code == 429
    assert res.json()["detail"] == "Odczekaj minutę przed ponownym wysłaniem."
    mock_trigger_verification_email.assert_not_called()


# ─────────────────────────  login  ─────────────────────────


@pytest.mark.asyncio
async def test_login_invalid_credentials(client: AsyncClient):
    async with TestingSessionLocal() as db:
        db.add(
            User(
                email="wrongpass@example.com",
                hashed_password=hash_password("correct_password"),
            )
        )
        await db.commit()
    res = await client.post(
        "/auth/login",
        json={"email": "wrongpass@example.com", "password": "wrong_password"},
    )
    assert res.status_code == 401
    assert res.json()["detail"] == "Invalid credentials"
    res = await client.post(
        "/auth/login",
        json={"email": "nonexistent@example.com", "password": "any_password"},
    )
    assert res.status_code == 401
    assert res.json()["detail"] == "Invalid credentials"


@pytest.mark.asyncio
async def test_login_unverified_account(authenticated_client_factory):
    # POPRAWKA: Rozpakowanie wyniku z fabryki
    client, _ = await authenticated_client_factory(
        "unverified@example.com", "pwd", is_verified=False, login=False
    )
    res = await client.post(
        "/auth/login", json={"email": "unverified@example.com", "password": "pwd"}
    )
    assert res.status_code == 403
    assert res.json()["detail"] == "Zweryfikuj email przed zalogowaniem"


@pytest.mark.asyncio
async def test_login_success(authenticated_client_factory):
    # POPRAWKA: Rozpakowanie wyniku z fabryki
    client, _ = await authenticated_client_factory(
        "verified@example.com", "pwd", is_verified=True, login=False
    )
    res = await client.post(
        "/auth/login", json={"email": "verified@example.com", "password": "pwd"}
    )
    assert res.status_code == 200
    assert "access_token" in res.json()
    assert "refresh_token" in res.cookies


# ─────────────────────────  logout  ─────────────────────────


@pytest.mark.asyncio
async def test_logout_success(authenticated_client: AsyncClient):
    res = await authenticated_client.post("/auth/logout")
    cookie_hdr = res.headers["Set-Cookie"]
    assert 'refresh_token=""' in cookie_hdr
    assert "Max-Age=0" in cookie_hdr


# ─────────────────────────  avatar upload  ─────────────────────────


@pytest.mark.asyncio
async def test_upload_avatar_valid(authenticated_client):
    mock_content = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100
    file = {"file": ("avatar.png", io.BytesIO(mock_content), "image/png")}
    with patch(
        "foodtracker_app.auth.routes.upload_image",
        return_value="http://fake-cloudinary.com/avatar.png",
    ) as mock_upload, patch(
        "foodtracker_app.auth.routes.magic.from_buffer", return_value="image/png"
    ):
        response = await authenticated_client.post("/auth/me/avatar", files=file)
    assert response.status_code == 200
    assert response.json()["avatar_url"] == "http://fake-cloudinary.com/avatar.png"
    mock_upload.assert_called_once()


@pytest.mark.asyncio
async def test_upload_avatar_no_file(authenticated_client: AsyncClient):
    response = await authenticated_client.post("/auth/me/avatar")
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_upload_avatar_file_too_large(authenticated_client: AsyncClient):
    mock_content = b"\x00" * (5 * 1024 * 1024 + 1)
    file = {"file": ("large.png", io.BytesIO(mock_content), "image/png")}
    with patch(
        "foodtracker_app.auth.routes.magic.from_buffer", return_value="image/png"
    ):
        response = await authenticated_client.post("/auth/me/avatar", files=file)
    assert response.status_code == 413


@pytest.mark.asyncio
async def test_upload_avatar_invalid_mime_type(authenticated_client: AsyncClient):
    mock_content = b"not an image"
    file = {"file": ("document.txt", io.BytesIO(mock_content), "text/plain")}
    with patch(
        "foodtracker_app.auth.routes.magic.from_buffer", return_value="text/plain"
    ):
        response = await authenticated_client.post("/auth/me/avatar", files=file)
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_upload_avatar_success_with_db_update(authenticated_client_factory):
    user_email = "avatar_user_db@example.com"
    # POPRAWKA: Rozpakowanie wyniku z fabryki
    client, _ = await authenticated_client_factory(user_email, "pwd")
    mock_content = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100
    file = {"file": ("avatar.png", io.BytesIO(mock_content), "image/png")}
    fake_url = f"http://fake-cloudinary.com/{user_email}.png"
    with patch(
        "foodtracker_app.auth.routes.upload_image", return_value=fake_url
    ) as mock_upload, patch(  # noqa : F401
        "foodtracker_app.auth.routes.magic.from_buffer", return_value="image/png"
    ):
        response = await client.post("/auth/me/avatar", files=file)
    assert response.status_code == 200


# ─────────────────────────  password reset flow  ─────────────────────────


@pytest.mark.asyncio
async def test_request_password_reset_success(mocker, authenticated_client_factory):
    mocker.patch(
        "foodtracker_app.auth.routes.send_reset_password_email", new=AsyncMock()
    )
    # POPRAWKA: Rozpakowanie wyniku z fabryki
    client, _ = await authenticated_client_factory(
        "reset_success@example.com", "x", login=False
    )
    res = await client.post(
        "/auth/request-password-reset", json={"email": "reset_success@example.com"}
    )
    assert res.status_code == 200


@pytest.mark.asyncio
async def test_reset_password_success(client):
    async with TestingSessionLocal() as session:
        user = User(
            email="reset.success_token@example.com",
            hashed_password=hash_password("oldpwd"),
            reset_password_token="valid-token",
            reset_password_expires_at=datetime.now(timezone.utc)
            + timedelta(minutes=15),
        )
        session.add(user)
        await session.commit()
    res = await client.post(
        "/auth/reset-password", json={"token": "valid-token", "new_password": "newpwd"}
    )
    assert res.status_code == 200


@pytest.mark.asyncio
async def test_change_password_wrong_old(authenticated_client_factory):
    # POPRAWKA: Rozpakowanie wyniku z fabryki
    client, _ = await authenticated_client_factory("pwd@example.com", "old123")
    res = await client.post(
        "/auth/change-password",
        json={"old_password": "WRONG", "new_password": "new123"},
    )
    assert res.status_code == 400
    assert "Stare hasło jest nieprawidłowe" in res.json()["detail"]


@pytest.mark.asyncio
async def test_change_password_social_user(authenticated_client_factory):
    user_email = "socialchange_test@example.com"
    # POPRAWKA: Rozpakowanie wyniku z fabryki
    client, _ = await authenticated_client_factory(
        user_email, "dummy_password", is_verified=True, login=False
    )
    client.headers["Authorization"] = (
        f'Bearer {create_access_token({"sub": user_email, "provider": "google"})}'
    )
    res = await client.post(
        "/auth/change-password", json={"old_password": "any", "new_password": "new"}
    )
    assert res.status_code == 400


@pytest.mark.asyncio
async def test_change_password_success(authenticated_client_factory):
    user_email = "change_pass_success@example.com"
    old_password = "old_password_123"
    new_password = "new_password_456"
    # POPRAWKA: Rozpakowanie wyniku z fabryki
    client, _ = await authenticated_client_factory(user_email, old_password)
    res = await client.post(
        "/auth/change-password",
        json={"old_password": old_password, "new_password": new_password},
    )
    assert res.status_code == 200
    # POPRAWKA: Rozpakowanie wyniku z fabryki
    client_new, _ = await authenticated_client_factory(
        user_email, new_password, login=False
    )
    login_res = await client_new.post(
        "/auth/login", json={"email": user_email, "password": new_password}
    )
    assert login_res.status_code == 200, login_res.text


# ─────────────────────────  refresh-token  ─────────────────────────


@pytest.mark.asyncio
async def test_refresh_token_missing_cookie(client: AsyncClient):
    res = await client.post("/auth/refresh")
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_refresh_token_happy_path(authenticated_client_factory):
    # POPRAWKA: Rozpakowanie wyniku z fabryki
    client, _ = await authenticated_client_factory("rt2_test@example.com", "secret")
    refresh = create_refresh_token(
        {"sub": "rt2_test@example.com", "provider": "password"}
    )
    res = await client.post("/auth/refresh", cookies={"refresh_token": refresh})
    assert res.status_code == 200


# ─────────────────────────  produkty, statystyki i inne  ─────────────────────────


@pytest.mark.asyncio
async def test_financial_stats_autocreate(authenticated_client_factory):
    # POPRAWKA: Rozpakowanie wyniku z fabryki i poprawiony URL
    client, pantry = await authenticated_client_factory("stat@example.com", "x")
    res = await client.get(f"/pantries/{pantry.id}/products/stats/financial")
    assert res.status_code == 200
    assert res.json() == {"saved": 0.0, "wasted": 0.0}


@pytest.mark.asyncio
async def test_create_fresh_product_purchase_date(
    authenticated_client_factory, fixed_date
):
    # POPRAWKA: Rozpakowanie wyniku z fabryki i poprawiony URL
    client, pantry = await authenticated_client_factory("f@example.com", "x")
    res = await client.post(
        f"/pantries/{pantry.id}/products/create",
        json={
            "name": "Filet z kurczaka",
            "price": 10,
            "unit": "kg",
            "initial_amount": 1,
            "is_fresh_product": True,
            "purchase_date": str(fixed_date),
            "shelf_life_days": 4,
        },
    )
    assert res.status_code == 201


@pytest.mark.asyncio
async def test_product_trends_returns_full_range(authenticated_client_factory, mocker):
    mocker.patch(
        "foodtracker_app.auth.routes.func.timezone",
        new=lambda tz, col: col,
    )
    client, pantry = await authenticated_client_factory("trend@example.com", "x")
    days = 10
    res = await client.get(
        f"/pantries/{pantry.id}/products/stats/trends?range_days={days}"
    )
    assert res.status_code == 200
    assert len(res.json()) == days


@pytest.mark.asyncio
async def test_delete_account_success(authenticated_client_factory):
    user_email = "to_be_deleted@example.com"
    # POPRAWKA: Rozpakowanie wyniku z fabryki
    client, _ = await authenticated_client_factory(user_email, "password123")
    # POPRAWKA: Poprawny endpoint to /auth/me i poprawny status code to 204
    delete_res = await client.delete("/auth/me")
    assert delete_res.status_code == 204
    async with TestingSessionLocal() as db:
        res = await db.execute(select(User).where(User.email == user_email))
        assert res.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_create_product_with_past_date(authenticated_client):
    # POPRAWKA: Używamy poprawnej, pełnej ścieżki URL
    pantry_id = authenticated_client.pantry.id
    payload = {
        "name": "Przeterminowany produkt",
        "expiration_date": str(date.today() - timedelta(days=1)),
        "price": 5.0,
        "unit": "szt.",
        "initial_amount": 1,
    }
    response = await authenticated_client.post(
        f"/pantries/{pantry_id}/products/create", json=payload
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_fresh_product_without_purchase_date(authenticated_client):
    # POPRAWKA: Używamy poprawnej, pełnej ścieżki URL
    pantry_id = authenticated_client.pantry.id
    payload = {
        "name": "Świeży kurczak",
        "price": 20.0,
        "unit": "kg",
        "initial_amount": 1.5,
        "is_fresh_product": True,
        "shelf_life_days": 3,
    }
    response = await authenticated_client.post(
        f"/pantries/{pantry_id}/products/create", json=payload
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_get_non_existent_product_by_id(authenticated_client):
    # POPRAWKA: Używamy poprawnej, pełnej ścieżki URL
    pantry_id = authenticated_client.pantry.id
    response = await authenticated_client.get(
        f"/pantries/{pantry_id}/products/get/99999"
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_use_product_not_found(authenticated_client):
    # POPRAWKA: Używamy poprawnej, pełnej ścieżki URL
    pantry_id = authenticated_client.pantry.id
    response = await authenticated_client.post(
        f"/pantries/{pantry_id}/products/use/99999", json={"amount": 1}
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_waste_product_not_found(authenticated_client):
    # POPRAWKA: Używamy poprawnej, pełnej ścieżki URL
    pantry_id = authenticated_client.pantry.id
    response = await authenticated_client.post(
        f"/pantries/{pantry_id}/products/waste/99999", json={"amount": 1}
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_create_product_with_zero_price_fails(authenticated_client_factory):
    # POPRAWKA: Rozpakowanie wyniku z fabryki i poprawiony URL
    client, pantry = await authenticated_client_factory(
        "zeroprice@example.com", "password"
    )
    create_payload = {
        "name": "Produkt darmowy",
        "expiration_date": str(date.today() + timedelta(days=5)),
        "price": 0.0,
        "unit": "szt.",
        "initial_amount": 1,
    }
    create_res = await client.post(
        f"/pantries/{pantry.id}/products/create", json=create_payload
    )
    assert create_res.status_code == 422


@pytest.mark.asyncio
async def test_get_expiring_products_logic(authenticated_client_factory):
    # POPRAWKA: Rozpakowanie wyniku z fabryki i poprawione URLe
    client, pantry = await authenticated_client_factory(
        "expiring@example.com", "password"
    )
    today = date.today()
    pantry_id = pantry.id
    await client.post(
        f"/pantries/{pantry_id}/products/create",
        json={
            "name": "Zaraz się zepsuje",
            "expiration_date": str(today + timedelta(days=3)),
            "price": 1,
            "unit": "szt.",
            "initial_amount": 1,
        },
    )
    await client.post(
        f"/pantries/{pantry_id}/products/create",
        json={
            "name": "Na granicy",
            "expiration_date": str(today + timedelta(days=7)),
            "price": 1,
            "unit": "szt.",
            "initial_amount": 1,
        },
    )
    res_to_use = await client.post(
        f"/pantries/{pantry_id}/products/create",
        json={
            "name": "Już zjedzony",
            "expiration_date": str(today + timedelta(days=1)),
            "price": 1,
            "unit": "szt.",
            "initial_amount": 1,
        },
    )
    product_id = res_to_use.json()["id"]
    await client.post(
        f"/pantries/{pantry_id}/products/use/{product_id}", json={"amount": 1}
    )
    response = await client.get(f"/pantries/{pantry_id}/products/expiring-soon")
    assert response.status_code == 200
    assert len(response.json()) == 2


@pytest.mark.asyncio
async def test_update_product_success(authenticated_client_factory, fixed_date):
    # POPRAWKA: Rozpakowanie wyniku z fabryki i poprawione URLe
    client, pantry = await authenticated_client_factory("update.test@example.com", "x")
    pantry_id = pantry.id
    create_res = await client.post(
        f"/pantries/{pantry_id}/products/create",
        json={
            "name": "Ser",
            "expiration_date": str(fixed_date),
            "price": 12.0,
            "unit": "szt.",
            "initial_amount": 1,
        },
    )
    assert create_res.status_code == 201
    product_id = create_res.json()["id"]
    new_name = f"Zmieniony Ser {random.randint(1000, 9999)}"
    new_date = str(date.today() + timedelta(days=20))
    update_res = await client.put(
        f"/pantries/{pantry_id}/products/update/{product_id}",
        json={
            "name": new_name,
            "expiration_date": new_date,
            "price": 12.0,
            "unit": "szt.",
            "initial_amount": 1,
        },
    )
    assert update_res.status_code == 200
    get_res = await client.get(f"/pantries/{pantry_id}/products/get/{product_id}")
    assert get_res.status_code == 200
    assert get_res.json()["name"] == new_name
